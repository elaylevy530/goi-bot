-- Backfill missing pickup/dropoff coords for the two pending test deliveries in Ashkelon
-- so the dispatch engine can match by GPS proximity.
UPDATE public.jobs SET pickup_lat = 31.6659543, pickup_lng = 34.592294,
                       dropoff_lat = 31.6633794, dropoff_lng = 34.5838658
WHERE id = '13132520-143d-4201-a9ed-173ea6bd4df1' AND pickup_lat IS NULL;
