-- Additional stakeholders/emails on a lead, beyond the one primary
-- Contact.email.
CREATE TABLE "ContactPerson" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactPerson_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ContactPerson_contactId_idx" ON "ContactPerson"("contactId");

CREATE INDEX "ContactPerson_email_idx" ON "ContactPerson"("email");

ALTER TABLE "ContactPerson" ADD CONSTRAINT "ContactPerson_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
