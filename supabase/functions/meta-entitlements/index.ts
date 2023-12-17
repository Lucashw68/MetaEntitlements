// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders })
    }

    const { username, range, applicationIds } = await req.json()
    const access_token = Deno.env.get('OCULUS_ACCESS_TOKEN') ?? null
    const url = `https://www.oculus.com/appreferrals/${username}/`
    const cookies = `oc_www_at=${access_token}`

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    if (!access_token) return new Response('Oculus AT is not set', { status: 500 })

    let applications: string[];
    if (!applicationIds) {
      const { data, error } = await supabase
        .from('Applications')
        .select('meta_id')

      if (error) throw new Error(error.message)
      const storedApplications = data?.map((app: any) => app.meta_id) ?? []
      applications = range ? storedApplications.slice(range.start, range.end) : storedApplications
    } else {
      applications = applicationIds
    }

    const batchedApplications = batchApplications(applications, 10);
    const entitlements = [];
    await Promise.all(
      batchedApplications.map(async (batch) => {
        const batchResponses = await Promise.all(
          batch.map(async (app) => {
            const res = await fetch(url + `${app}/`, {
              method: 'HEAD',
              headers: {
                'Cookie': cookies
              },
              redirect: 'manual'
            });
            const status = res.status;
            if (status === 200) {
              return { app, status };
            }
            return null;
          })
        );
        entitlements.push(...batchResponses.filter(Boolean));
      })
    );

    return new Response(JSON.stringify({
      applicationsTested: applications.length,
      entitlements,
      username
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})

function batchApplications(applications: string[], batchSize: number): string[][] {
  const batchedApplications: string[][] = [];
  for (let i = 0; i < applications.length; i += batchSize) {
    const batch = applications.slice(i, i + batchSize);
    batchedApplications.push(batch);
  }
  return batchedApplications;
}


// To invoke:
// curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/' \
//   --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
//   --header 'Content-Type: application/json' \
//   --data '{"name":"Functions"}'
