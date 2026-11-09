-- Speaker-diarized transcripts for recorded phone calls (Twilio recording
-- + AssemblyAI diarization — see lib/integrations/assemblyai.ts and
-- lib/call-transcription.ts). Nullable/no default: only CALL interactions
-- that actually went through the Twilio recorded-call flow ever get a
-- transcriptStatus set (to PENDING, by the recording-status webhook).

ALTER TABLE "Interaction" ADD COLUMN "transcript" TEXT;
ALTER TABLE "Interaction" ADD COLUMN "transcriptStatus" "TranscriptStatus";
ALTER TABLE "Interaction" ADD COLUMN "transcriptError" TEXT;
