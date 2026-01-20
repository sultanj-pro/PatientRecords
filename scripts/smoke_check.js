(async ()=>{
  try{
    const login = await fetch('http://localhost:3001/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:'doc1'})});
    const j = await login.json();
    const token = j.accessToken;
    console.log('login status', login.status, 'token_len', token ? token.length : 0);
    const endpoints = ['vitals','labs','visits','meds'];
    for(const e of endpoints){
      const r = await fetch(`http://localhost:3001/api/patients/31323/${e}`, { headers: { Authorization: `Bearer ${token}` } });
      const ok = r.ok;
      let count = 'n/a';
      if(ok){
        const body = await r.json();
        if(Array.isArray(body)) count = body.length; else count = typeof body;
      }
      console.log(e, r.status, 'items=', count);
    }
  }catch(err){
    console.error('error', err.message);
    process.exit(1);
  }
})();
