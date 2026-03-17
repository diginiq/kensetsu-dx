-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED');
CREATE TYPE "EntryType" AS ENUM ('CLOCK_IN', 'CLOCK_OUT');

-- CreateTable daily_reports
CREATE TABLE "daily_reports" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reportDate" TIMESTAMP(3) NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "breakMinutes" INTEGER NOT NULL DEFAULT 60,
    "weather" TEXT,
    "temperature" DOUBLE PRECISION,
    "workCategories" JSONB NOT NULL,
    "photos" TEXT[],
    "memo" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'DRAFT',
    "rejectReason" TEXT,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "daily_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable time_entries
CREATE TABLE "time_entries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "type" "EntryType" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "time_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable overtime_settings
CREATE TABLE "overtime_settings" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "monthlyLimitHours" INTEGER NOT NULL DEFAULT 45,
    "yearlyLimitHours" INTEGER NOT NULL DEFAULT 360,
    "alertThreshold" INTEGER NOT NULL DEFAULT 30,
    CONSTRAINT "overtime_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "daily_reports_siteId_idx" ON "daily_reports"("siteId");
CREATE INDEX "daily_reports_userId_idx" ON "daily_reports"("userId");
CREATE INDEX "daily_reports_userId_reportDate_idx" ON "daily_reports"("userId", "reportDate");
CREATE INDEX "time_entries_userId_idx" ON "time_entries"("userId");
CREATE INDEX "time_entries_siteId_idx" ON "time_entries"("siteId");
CREATE INDEX "time_entries_userId_timestamp_idx" ON "time_entries"("userId", "timestamp");
CREATE UNIQUE INDEX "overtime_settings_companyId_key" ON "overtime_settings"("companyId");

-- AddForeignKey
ALTER TABLE "daily_reports" ADD CONSTRAINT "daily_reports_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "daily_reports" ADD CONSTRAINT "daily_reports_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "daily_reports" ADD CONSTRAINT "daily_reports_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "overtime_settings" ADD CONSTRAINT "overtime_settings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
