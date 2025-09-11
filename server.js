import "dotenv/config";

import express from "express";
import cors from "cors";
import { randomUUID } from "crypto";
import {
  ChimeSDKMeetingsClient,
  CreateMeetingCommand,
  CreateAttendeeCommand,
} from "@aws-sdk/client-chime-sdk-meetings";

import { STSClient, GetCallerIdentityCommand } from "@aws-sdk/client-sts";
const REGION = process.env.AWS_CHIME_REGION || process.env.AWS_REGION || "us-east-1";
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const client = new ChimeSDKMeetingsClient({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});
const rooms = new Map();
const meetingHosts = new Map();
const meetingSettings = new Map();
// const roomToMeetingId = new Map();
const meetingProfiles = new Map();
const meetingDetails = new Map();
const meetingCollaborators = new Map();

function getCollaborators(meetingId) {
  if (!meetingCollaborators.has(meetingId))
    meetingCollaborators.set(meetingId, new Set());
  return meetingCollaborators.get(meetingId);
}
function setCollaborators(meetingId, arr) {
  const s = new Set((arr || []).filter(Boolean).slice(0, 4)); // cap 4
  meetingCollaborators.set(meetingId, s);
  return Array.from(s);
}

async function getOrCreateMeeting(room) {
  if (rooms.has(room)) return rooms.get(room);
  const resp = await client.send(
    new CreateMeetingCommand({
      ClientRequestToken: randomUUID(),
      MediaRegion: REGION,
      ExternalMeetingId: room.slice(0, 64),
    })
  );
  rooms.set(room, resp.Meeting);
  return resp.Meeting;
}

// POST /meeting: create a meeting and return the meeting object
app.post("/meeting", async (req, res) => {
  try {
    const room = (req.body?.room || `meeting-${Date.now()}`).toString();
    const mediaRegion = (req.body?.mediaRegion || REGION).toString();
    const externalMeetingId = (req.body?.externalMeetingId || room).toString();
    const maxAttendees = parseInt(req.body?.maxAttendees) || 10;

    // Create a fresh meeting even if a room exists when explicit flag provided
    let meeting;
    if (rooms.has(room)) {
      meeting = rooms.get(room);
    } else {
      const resp = await client.send(
        new CreateMeetingCommand({
          ClientRequestToken: randomUUID(),
          MediaRegion: mediaRegion,
          ExternalMeetingId: externalMeetingId.slice(0, 64),
        })
      );
      meeting = resp.Meeting;
      rooms.set(room, meeting);
    }

    meetingSettings.set(meeting.MeetingId, {
      maxAttendees,
      isGroupCall: false,
      currentAttendees: 0,
      room,
    });

    res.json({ Meeting: meeting, meetingId: meeting.MeetingId, room });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// POST /attendee: join a user to a meeting and return attendee object
app.post("/attendee", async (req, res) => {
  try {
    const meetingId = req.body?.meetingId;
    const externalUserId = (req.body?.externalUserId || `user-${Date.now()}`).toString();
    if (!meetingId) return res.status(400).json({ error: "meetingId is required" });

    // Find meeting by meetingId across stored rooms
    let meeting = null;
    let room = null;
    if (rooms.size > 0) {
      for (const [r, m] of rooms.entries()) {
        if (m.MeetingId === meetingId) {
          meeting = m;
          room = r;
          break;
        }
      }
    }

    if (!meeting) return res.status(404).json({ error: "Meeting not found" });

    const attendeeResp = await client.send(
      new CreateAttendeeCommand({ MeetingId: meetingId, ExternalUserId: externalUserId })
    );

    const settings = meetingSettings.get(meetingId) || {
      maxAttendees: 10,
      isGroupCall: false,
      currentAttendees: 0,
      room,
    };
    settings.currentAttendees++;
    if (settings.currentAttendees >= 2) settings.isGroupCall = true;
    meetingSettings.set(meetingId, settings);

    res.json({ Attendee: attendeeResp.Attendee, meetingId, room });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

//collaborators

app.post("/collaborators/:meetingId", express.json(), async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { currentHostId, collaboratorIds = [] } = req.body;

    const currentHost = meetingHosts.get(meetingId);
    if (!currentHost || currentHost !== currentHostId) {
      return res
        .status(403)
        .json({ error: "Unauthorized: Not the current host" });
    }

    // Enforce maximum of 4 collaborators
    if (Array.isArray(collaboratorIds) && collaboratorIds.filter(Boolean).length > 4) {



      
      console.log("maximum of 4 collaborators allowed");
      return res
        .status(400)
        .json({ error: "Maximum of 4 collaborators allowed" });
    }

    const finalList = setCollaborators(meetingId, collaboratorIds);
    res.json({ success: true, collaborators: finalList });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.get("/collaborators/:meetingId", (req, res) => {
  const { meetingId } = req.params;
  res.json({ collaborators: Array.from(getCollaborators(meetingId)) });
});

app.get("/meeting", async (req, res) => {
  try {
    const room = (req.query.room || "meeting-" + Date.now()).toString();
    const maxAttendees = parseInt(req.query.max) || 10; // Default max 10 attendees

    const meeting = await getOrCreateMeeting(room);

    // Single attendee (potential host)
    const attendee = await client.send(
      new CreateAttendeeCommand({
        MeetingId: meeting.MeetingId,
        ExternalUserId: `user-${Date.now()}`,
      })
    );

    // STORE: This could become host if more people join
    meetingHosts.set(meeting.MeetingId, attendee.Attendee.AttendeeId);
    console.log(
      `[SERVER] Set host for meeting ${meeting.MeetingId}: ${attendee.Attendee.AttendeeId}`
    );
    console.log(
      `[SERVER] Current meetingHosts map:`,
      Array.from(meetingHosts.entries())
    );

    meetingSettings.set(meeting.MeetingId, {
      maxAttendees,
      isGroupCall: false,
      currentAttendees: 1,
      room: room,
    });
    console.log("attendee id", attendee.Attendee.AttendeeId);
    const collaborators = Array.from(getCollaborators(meeting.MeetingId));

    const enc = Buffer.from(
      JSON.stringify({
        Meeting: meeting,
        Attendee: attendee.Attendee,
        isHost: true,
        maxAttendees: maxAttendees,
        isGroupCall: false,
        room: room,
        hostAttendeeId: attendee.Attendee.AttendeeId,
        collaborators,
      })
    ).toString("base64");
    console.log(
      `[SERVER] Host meeting info created with hostAttendeeId: ${attendee.Attendee.AttendeeId}`
    );

    const base = `${req.protocol}://${req.get("host")}`;
    const page = "/chime-sdk.html";
    const url = `${base}${page}?meetingInfo=${encodeURIComponent(enc)}`;

    res.json({
      url: url,
      meetingId: meeting.MeetingId,
      room: room,
      maxAttendees: maxAttendees,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.get("/join/:identifier", async (req, res) => {
  try {
    const identifier = req.params.identifier;
    let meetingId = identifier;
    let meeting = null;
    let room = null;
    console.log(rooms);

    if (rooms.has(identifier)) {
      meeting = rooms.get(identifier);
      meetingId = meeting.MeetingId;
      room = identifier;
      console.log(
        `[SERVER] Found meeting by room name: ${identifier} -> ${meetingId}`
      );
    } else {
      for (const [meetingRoom, meetingData] of rooms.entries()) {
        if (meetingData.MeetingId === identifier) {
          meeting = meetingData;
          room = meetingRoom;
          console.log(
            `[SERVER] Found meeting by ID: ${identifier} in room: ${room}`
          );
          break;
        }
      }
    }

    if (!meeting) {
      console.log(`[SERVER] Meeting not found for identifier: ${identifier}`);
      return res.status(404).json({ error: "Meeting not found" });
    }

    const settings = meetingSettings.get(meetingId);
    if (!settings) {
      console.log(`[SERVER] Meeting settings not found for: ${meetingId}`);
      return res.status(404).json({ error: "Meeting settings not found" });
    }

    if (settings.currentAttendees >= settings.maxAttendees) {
      return res.status(403).json({ error: "Meeting is full" });
    }

    const attendee = await client.send(
      new CreateAttendeeCommand({
        MeetingId: meetingId,
        ExternalUserId: `user-${Date.now()}`,
      })
    );

    settings.currentAttendees++;

    if (settings.currentAttendees === 2) {
      settings.isGroupCall = true;
      console.log(`[SERVER] Meeting ${meetingId} is now a group call`);
    }
    const hostAttendeeId = meetingHosts.get(meetingId);
    console.log(
      `[SERVER] Host attendee ID for meeting ${meetingId}:`,
      hostAttendeeId
    );
    console.log(
      `[SERVER] All meeting hosts:`,
      Array.from(meetingHosts.entries())
    );
    console.log(`[SERVER] Looking up meetingId:`, meetingId);
    console.log(`[SERVER] meetingHosts has key:`, meetingHosts.has(meetingId));
    const collaborators = Array.from(getCollaborators(meetingId));

    const enc = Buffer.from(
      JSON.stringify({
        Meeting: meeting,
        Attendee: attendee.Attendee,
        isHost: false,
        maxAttendees: settings.maxAttendees,
        isGroupCall: settings.isGroupCall,
        room: room,
        hostAttendeeId: hostAttendeeId,
        collaborators,
      })
    ).toString("base64");

    const base = `${req.protocol}://${req.get("host")}`;
    const page = "/chime-sdk.html";
    const url = `${base}${page}?meetingInfo=${encodeURIComponent(enc)}`;

    console.log(
      `[SERVER] Added attendee to meeting: ${meetingId}, total: ${settings.currentAttendees}`
    );

    res.json({
      url: url,
      meetingId: meetingId,
      room: room,
      isGroupCall: settings.isGroupCall,
      currentAttendees: settings.currentAttendees,
      maxAttendees: settings.maxAttendees,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.get("/status/:identifier", async (req, res) => {
  try {
    const identifier = req.params.identifier;
    let meetingId = identifier;
    let meeting = null;
    let room = null;

    if (rooms.has(identifier)) {
      meeting = rooms.get(identifier);
      meetingId = meeting.MeetingId;
      room = identifier;
    } else {
      for (const [meetingRoom, meetingData] of rooms.entries()) {
        if (meetingData.MeetingId === identifier) {
          meeting = meetingData;
          room = meetingRoom;
          break;
        }
      }
    }

    if (!meeting) {
      return res.status(404).json({ error: "Meeting not found" });
    }

    const settings = meetingSettings.get(meetingId);
    if (!settings) {
      return res.status(404).json({ error: "Meeting settings not found" });
    }

    res.json({
      meetingId: meetingId,
      room: room,
      isGroupCall: settings.isGroupCall,
      currentAttendees: settings.currentAttendees,
      maxAttendees: settings.maxAttendees,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.get("/meetings", async (req, res) => {
  try {
    const activeMeetings = [];

    for (const [room, meeting] of rooms.entries()) {
      const settings = meetingSettings.get(meeting.MeetingId);
      if (settings) {
        activeMeetings.push({
          room: room,
          meetingId: meeting.MeetingId,
          isGroupCall: settings.isGroupCall,
          currentAttendees: settings.currentAttendees,
          maxAttendees: settings.maxAttendees,
        });
      }
    }

    res.json({ meetings: activeMeetings });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.get("/pair", async (req, res) => {
  try {
    const room = (req.query.room || "demo-room").toString();
    const meeting = await getOrCreateMeeting(room);

    const mk = async (user) =>
      (
        await client.send(
          new CreateAttendeeCommand({
            MeetingId: meeting.MeetingId,
            ExternalUserId: user,
          })
        )
      ).Attendee;

    const hostAttendee = await mk("host-" + Date.now(), true);
    const regularAttendee = await mk("user-" + Date.now(), false);

    meetingHosts.set(meeting.MeetingId, hostAttendee.AttendeeId);

    const enc = (att, isHost) =>
      Buffer.from(
        JSON.stringify({
          Meeting: meeting,
          Attendee: att,
          isHost: isHost,
        })
      ).toString("base64");

    const base = `${req.protocol}://${req.get("host")}`;
    const page = "/chime-sdk.html";
    res.json({
      urlA: `${base}${page}?meetingInfo=${encodeURIComponent(
        enc(hostAttendee)
      )}`,
      urlB: `${base}${page}?meetingInfo=${encodeURIComponent(
        enc(regularAttendee)
      )}`,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.get("/group", async (req, res) => {
  try {
    const room = (req.query.room || "group-room").toString();
    const attendeeCount = parseInt(req.query.count) || 5;

    const meeting = await getOrCreateMeeting(room);

    const attendees = [];
    for (let i = 0; i < attendeeCount; i++) {
      const attendee = await client.send(
        new CreateAttendeeCommand({
          MeetingId: meeting.MeetingId,
          ExternalUserId: `user-${i}-${Date.now()}`,
        })
      );
      attendees.push(attendee.Attendee);
    }

    meetingHosts.set(meeting.MeetingId, attendees[0].AttendeeId);

    const base = `${req.protocol}://${req.get("host")}`;
    const page = "/chime-sdk.html";

    const urls = attendees.map((att, index) => {
      const enc = Buffer.from(
        JSON.stringify({
          Meeting: meeting,
          Attendee: att,
          isHost: index === 0,
        })
      ).toString("base64");

      return `${base}${page}?meetingInfo=${encodeURIComponent(enc)}`;
    });

    res.json({ urls, meetingId: meeting.MeetingId });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.post("/meeting-details/:meetingId", express.json(), async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { title, topic, discussionPoints, hostAttendeeId } = req.body;

    if (!meetingDetails.has(meetingId)) {
      meetingDetails.set(meetingId, {});
    }

    meetingDetails.get(meetingId).title = title;
    meetingDetails.get(meetingId).topic = topic;
    meetingDetails.get(meetingId).discussionPoints = discussionPoints;
    meetingDetails.get(meetingId).hostAttendeeId = hostAttendeeId;

    console.log(`[SERVER] Meeting details updated for ${meetingId}:`, {
      title,
      topic,
      discussionPoints,
    });

    res.json({ success: true, message: "Meeting details updated" });
  } catch (e) {
    console.error("[SERVER] Meeting details update error:", e);
    res.status(500).json({ error: e.message });
  }
});

app.get("/meeting-details/:meetingId", async (req, res) => {
  try {
    const { meetingId } = req.params;
    const details = meetingDetails.get(meetingId) || {};

    res.json({ meetingDetails: details });
  } catch (e) {
    console.error("[SERVER] Get meeting details error:", e);
    res.status(500).json({ error: e.message });
  }
});

app.get("/whoami", async (_req, res) => {
  try {
    const sts = new STSClient({
      region: process.env.AWS_REGION || "us-east-1",
    });
    const out = await sts.send(new GetCallerIdentityCommand({}));
    res.json({
      account: out.Account,
      arn: out.Arn,
      userId: out.UserId,
      region: process.env.AWS_REGION,
      key_tail: (process.env.AWS_ACCESS_KEY_ID || "").slice(-4),
    });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.post("/assign-host/:meetingId", express.json(), async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { currentHostId, newHostId } = req.body;

    console.log(`[SERVER] Host assignment request for meeting: ${meetingId}`);
    console.log(
      `[SERVER] Current host: ${currentHostId}, New host: ${newHostId}`
    );

    const currentHost = meetingHosts.get(meetingId);
    if (!currentHost || currentHost !== currentHostId) {
      return res
        .status(403)
        .json({ error: "Unauthorized: Not the current host" });
    }

    meetingHosts.set(meetingId, newHostId);

    console.log(
      `[SERVER] Host updated for meeting ${meetingId}: ${currentHostId} -> ${newHostId}`
    );

    res.json({
      success: true,
      meetingId,
      previousHost: currentHostId,
      newHost: newHostId,
      message: "Host assignment successful",
    });
  } catch (e) {
    console.error("[SERVER] Host assignment error:", e);
    res.status(500).json({ error: e.message });
  }
});

app.get("/host/:meetingId", async (req, res) => {
  try {
    const { meetingId } = req.params;
    const hostId = meetingHosts.get(meetingId);

    if (!hostId) {
      return res.status(404).json({ error: "Meeting or host not found" });
    }

    res.json({ meetingId, hostId });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.post("/profile/:meetingId", express.json(), async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { attendeeId, name, avatarInitial, avatarColor } = req.body || {};
    if (!meetingId || !attendeeId)
      return res.status(400).json({ error: "missing meetingId/attendeeId" });

    let map = meetingProfiles.get(meetingId);
    if (!map) {
      map = new Map();
      meetingProfiles.set(meetingId, map);
    }
    map.set(attendeeId, { name, avatarInitial, avatarColor });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.get("/profile/:meetingId", async (req, res) => {
  try {
    const { meetingId } = req.params;
    const map = meetingProfiles.get(meetingId);
    const profiles = {};
    if (map) {
      for (const [k, v] of map.entries()) profiles[k] = v;
    }
    res.json({ profiles });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
