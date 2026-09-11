-- Per-user email signature, appended server-side to outbound mail.
ALTER TABLE "User"
  ADD COLUMN "signatureEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "signatureName" TEXT,
  ADD COLUMN "signatureTitle" TEXT,
  ADD COLUMN "signatureCompany" TEXT,
  ADD COLUMN "signatureAddress" TEXT,
  ADD COLUMN "signaturePhone" TEXT,
  ADD COLUMN "signatureEmail" TEXT,
  ADD COLUMN "signatureWebsite" TEXT,
  ADD COLUMN "signatureInstagram" TEXT,
  ADD COLUMN "signatureFacebook" TEXT,
  ADD COLUMN "signatureLogoUrl" TEXT,
  ADD COLUMN "signatureAccent" TEXT;
