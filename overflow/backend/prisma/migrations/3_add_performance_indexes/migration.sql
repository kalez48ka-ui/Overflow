-- Add indexes for Match queries (status filtering, team lookups)
CREATE INDEX "Match_status_startTime_idx" ON "Match"("status", "startTime");
CREATE INDEX "Match_homeTeamId_idx" ON "Match"("homeTeamId");
CREATE INDEX "Match_awayTeamId_idx" ON "Match"("awayTeamId");

-- Add index for UpsetEvent lookups by match
CREATE INDEX "UpsetEvent_matchId_idx" ON "UpsetEvent"("matchId");
