UPDATE events SET event_type = 'purchase' WHERE event_type = 'payment';

UPDATE organizations
SET funnel_steps = (
  SELECT jsonb_agg(
    CASE
      WHEN elem->>'eventType' = 'payment'
      THEN jsonb_set(elem, '{eventType}', '"purchase"')
      ELSE elem
    END
  )
  FROM jsonb_array_elements(funnel_steps) AS elem
)
WHERE funnel_steps::text LIKE '%"payment"%';
