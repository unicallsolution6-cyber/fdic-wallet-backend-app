-- Step 1: Drop the default value temporarily
ALTER TABLE "transactions" ALTER COLUMN "status" DROP DEFAULT;

-- Step 2: Create new enum with APPROVED instead of FAILED
CREATE TYPE "TransactionStatus_new" AS ENUM ('APPROVED', 'REVIEW', 'PENDING', 'CANCELLED');

-- Step 3: Update transactions table to use new enum, converting FAILED to APPROVED and REVIEW to REVIEW
ALTER TABLE "transactions"
  ALTER COLUMN "status" TYPE "TransactionStatus_new"
  USING (
    CASE
      WHEN status::text = 'FAILED' THEN 'APPROVED'::text
      ELSE status::text
    END
  )::"TransactionStatus_new";

-- Step 4: Drop old enum and rename new one
DROP TYPE "TransactionStatus";
ALTER TYPE "TransactionStatus_new" RENAME TO "TransactionStatus";

-- Step 5: Restore the default value
ALTER TABLE "transactions" ALTER COLUMN "status" SET DEFAULT 'PENDING'::"TransactionStatus";
