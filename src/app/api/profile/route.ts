import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function POST(req: Request) {
  try {
    const data = await req.json();
    
    // For now, we use a placeholder user_id if one isn't provided by auth context.
    const user_id = data.user_id || 'default-user-id';

    // 1. Create table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS profile_and_residency (
        user_id VARCHAR(255) PRIMARY KEY,
        live_tracking_active BOOLEAN,
        trips JSONB,
        manual_days INTEGER,
        days_in_india_current_year INTEGER,
        days_in_india_preceding_4_years_gte_365 BOOLEAN,
        employment_or_crew_status VARCHAR(50),
        is_departure_year BOOLEAN,
        is_indian_citizen BOOLEAN,
        is_pio_or_oci BOOLEAN,
        nr_years_last_10_gte_9 BOOLEAN,
        days_in_india_last_7_years_lte_729 BOOLEAN,
        income_above_15l BOOLEAN,
        liable_to_tax_in_another_country BOOLEAN,
        is_wholly_outside_india BOOLEAN,
        is_indian_company BOOLEAN,
        is_poem_in_india BOOLEAN,
        final_india_residency_status VARCHAR(50),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Upsert data
    const query = `
      INSERT INTO profile_and_residency (
        user_id,
        live_tracking_active,
        trips,
        manual_days,
        days_in_india_current_year,
        days_in_india_preceding_4_years_gte_365,
        employment_or_crew_status,
        is_departure_year,
        is_indian_citizen,
        is_pio_or_oci,
        nr_years_last_10_gte_9,
        days_in_india_last_7_years_lte_729,
        income_above_15l,
        liable_to_tax_in_another_country,
        is_wholly_outside_india,
        is_indian_company,
        is_poem_in_india,
        final_india_residency_status,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, CURRENT_TIMESTAMP
      )
      ON CONFLICT (user_id) DO UPDATE SET
        live_tracking_active = EXCLUDED.live_tracking_active,
        trips = EXCLUDED.trips,
        manual_days = EXCLUDED.manual_days,
        days_in_india_current_year = EXCLUDED.days_in_india_current_year,
        days_in_india_preceding_4_years_gte_365 = EXCLUDED.days_in_india_preceding_4_years_gte_365,
        employment_or_crew_status = EXCLUDED.employment_or_crew_status,
        is_departure_year = EXCLUDED.is_departure_year,
        is_indian_citizen = EXCLUDED.is_indian_citizen,
        is_pio_or_oci = EXCLUDED.is_pio_or_oci,
        nr_years_last_10_gte_9 = EXCLUDED.nr_years_last_10_gte_9,
        days_in_india_last_7_years_lte_729 = EXCLUDED.days_in_india_last_7_years_lte_729,
        income_above_15l = EXCLUDED.income_above_15l,
        liable_to_tax_in_another_country = EXCLUDED.liable_to_tax_in_another_country,
        is_wholly_outside_india = EXCLUDED.is_wholly_outside_india,
        is_indian_company = EXCLUDED.is_indian_company,
        is_poem_in_india = EXCLUDED.is_poem_in_india,
        final_india_residency_status = EXCLUDED.final_india_residency_status,
        updated_at = CURRENT_TIMESTAMP
    `;

    const values = [
      user_id,
      data.live_tracking_active ?? false,
      JSON.stringify(data.trips || []),
      data.manual_days ?? 0,
      data.days_in_india_current_year ?? 0,
      data.days_in_india_preceding_4_years_gte_365 ?? null,
      data.employment_or_crew_status ?? null,
      data.is_departure_year ?? null,
      data.is_indian_citizen ?? null,
      data.is_pio_or_oci ?? null,
      data.nr_years_last_10_gte_9 ?? null,
      data.days_in_india_last_7_years_lte_729 ?? null,
      data.income_above_15l ?? null,
      data.liable_to_tax_in_another_country ?? false,
      data.is_wholly_outside_india ?? null,
      data.is_indian_company ?? null,
      data.is_poem_in_india ?? null,
      data.final_india_residency_status ?? 'UNKNOWN'
    ];

    await pool.query(query, values);

    return NextResponse.json({ success: true, message: 'Profile saved successfully' });
  } catch (error: any) {
    console.error('Error saving profile:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
