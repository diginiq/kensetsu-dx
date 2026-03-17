-- AlterEnum UserRole: 旧値→新値にマッピング
CREATE TYPE "UserRole_new" AS ENUM ('SUPER_ADMIN', 'COMPANY_ADMIN', 'WORKER');

ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" TYPE "UserRole_new" USING
  CASE "role"::text
    WHEN 'OWNER'   THEN 'COMPANY_ADMIN'::"UserRole_new"
    WHEN 'MANAGER' THEN 'COMPANY_ADMIN'::"UserRole_new"
    WHEN 'WORKER'  THEN 'WORKER'::"UserRole_new"
    WHEN 'OFFICE'  THEN 'COMPANY_ADMIN'::"UserRole_new"
    ELSE 'WORKER'::"UserRole_new"
  END;

DROP TYPE "UserRole";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'WORKER';

-- CreateEnum CompanyStatus
CREATE TYPE "CompanyStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'TRIAL');

-- AlterTable companies
ALTER TABLE "companies" ADD COLUMN "status" "CompanyStatus" NOT NULL DEFAULT 'TRIAL';
ALTER TABLE "companies" ADD COLUMN "stripeCustomerId" TEXT;
ALTER TABLE "companies" ADD COLUMN "stripeSubscriptionId" TEXT;
ALTER TABLE "companies" ADD COLUMN "planExpiresAt" TIMESTAMP(3);

-- AlterTable users
ALTER TABLE "users" ALTER COLUMN "companyId" DROP NOT NULL;
ALTER TABLE "users" ADD COLUMN "phone" TEXT;
ALTER TABLE "users" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable site_assignments
CREATE TABLE "site_assignments" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "site_assignments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "site_assignments_siteId_userId_key" ON "site_assignments"("siteId", "userId");
CREATE INDEX "site_assignments_siteId_idx" ON "site_assignments"("siteId");
CREATE INDEX "site_assignments_userId_idx" ON "site_assignments"("userId");

ALTER TABLE "site_assignments" ADD CONSTRAINT "site_assignments_siteId_fkey"
  FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "site_assignments" ADD CONSTRAINT "site_assignments_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DropTable workers（作業員台帳はUserに統合）
DROP TABLE IF EXISTS "workers";
