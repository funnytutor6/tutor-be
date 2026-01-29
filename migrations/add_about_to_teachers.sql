-- Add 'about' column to Teachers table (without default value)
ALTER TABLE Teachers
ADD COLUMN about TEXT NULL COMMENT ' bio/description - cannot contain links, emails, or contact information' AFTER profilePhoto;