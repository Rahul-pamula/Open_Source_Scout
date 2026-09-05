import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://sskncjaaiuexwsdkmjpf.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNza25jamFhaXVleHdzZGttanBmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzQyMzU4NCwiZXhwIjoyMTAyOTk5NTg0fQ.lw3UYPs2zXa7MtEAh_P5SZpcKpmZanRoa-on3dV-fk8');

async function run() {
  console.log("Invoking evaluate...");
  const res = await supabase.functions.invoke('evaluate', {
    body: { issues: [{ id: 1, url: 'x' }], profile: 'tester' }
  });
  console.log(res);
}
run();
