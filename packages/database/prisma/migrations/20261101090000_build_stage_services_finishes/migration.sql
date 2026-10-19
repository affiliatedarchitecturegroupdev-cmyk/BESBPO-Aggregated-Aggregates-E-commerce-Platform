-- Two build stages for the services & fit-out departments (docs/pricing/FITOUT_CATALOGUE.md).
ALTER TYPE "BuildStage" ADD VALUE IF NOT EXISTS 'SERVICES' AFTER 'ROOFING';
ALTER TYPE "BuildStage" ADD VALUE IF NOT EXISTS 'FINISHES' AFTER 'SERVICES';
