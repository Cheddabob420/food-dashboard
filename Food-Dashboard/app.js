const state = { recipes: [], sides: [], planner: [], managed: [], _renderedRecipes: null }

async function loadRecipes(){
  const res = await fetch('recipes.json');
  state.recipes = await res.json();
}

async function loadSides(){
  try{
    const res = await fetch('sides.json');
    state.sides = await res.json();
  }catch(e){ state.sides = []; }
}

function $(sel, root=document){ return root.querySelector(sel) }
function $all(sel, root=document){ return Array.from(root.querySelectorAll(sel)) }

function renderRecipes(){
  // prefer managed/merged recipes when present
  const recipesToShow = state._renderedRecipes || state.recipes;
  const list = $('#recipes-list');
  list.innerHTML = '';
  const tpl = document.getElementById('recipe-card');
  recipesToShow.forEach(r=>{
    const node = tpl.content.cloneNode(true);
    node.querySelector('.recipe-name').textContent = r.name;
    node.querySelector('.meta').textContent = `${(r.ingredients||[]).length} ingredients`;
    const ingList = node.querySelector('.ingredients');
    (r.ingredients||[]).forEach(i=>{
      const li = document.createElement('li');
      li.textContent = `${i.qty} ${i.unit} ${i.item}`;
      ingList.appendChild(li);
    });
    const addBtn = node.querySelector('.add-btn');
    addBtn.addEventListener('click', ()=>{
      chooseSideOrAdd(r);
    });
    list.appendChild(node);
  });
}

function addToPlanner(id, sideId){
  const entry = { uid: Date.now().toString(36) + Math.random().toString(36).slice(2), id, sideId: sideId || null };
  state.planner.push(entry);
  updateHashFromPlanner();
}

function chooseSideOrAdd(recipe){
  // If the recipe explicitly contains a "choose side" ingredient, present all sides
  const hasChooseToken = Array.isArray(recipe.ingredients) && recipe.ingredients.some(i=>{
    return (typeof i.item === 'string' && i.item.toLowerCase().includes('choose side')) || (typeof i.unit === 'string' && i.unit.toLowerCase() === 'choice');
  });

  const availableSideIds = hasChooseToken ? state.sides.map(s=>s.id) : (recipe.sides || []);
  if(!availableSideIds || availableSideIds.length === 0){
    addToPlanner(recipe.id, null);
    renderPlanner(); renderShopping();
    return;
  }

  // populate modal with available sides
  const modal = $('#side-modal');
  const list = $('#side-options');
  list.innerHTML = '';
  $('#modal-recipe-name').textContent = recipe.name;
  availableSideIds.forEach(sid=>{
    const side = state.sides.find(x=>x.id===sid);
    if(!side) return;
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.textContent = side.name;
    btn.addEventListener('click', ()=>{
      addToPlanner(recipe.id, side.id);
      closeModal(); renderPlanner(); renderShopping();
    });
    li.appendChild(btn);
    list.appendChild(li);
  });
  modal.hidden = false;
}

function closeModal(){
  const modal = $('#side-modal');
  if(modal) modal.hidden = true;
}

function renderPlanner(){
  const ul = $('#planner-list');
  ul.innerHTML = '';
  state.planner.forEach(entry=>{
    const r = state.recipes.find(x=>x.id===entry.id);
    const side = state.sides.find(s=>s.id===entry.sideId);
    const li = document.createElement('li');
    li.innerHTML = `<span>${r ? r.name : entry.id}${side ? ' — ' + side.name : ''}</span><div><button class="remove">Remove</button></div>`;
    li.querySelector('.remove').addEventListener('click', ()=>{
      const idx = state.planner.findIndex(it=>it.uid===entry.uid);
      if(idx>-1) state.planner.splice(idx,1);
      renderPlanner(); renderShopping(); updateHashFromPlanner();
    });
    ul.appendChild(li);
  });
}

function aggregateIngredients(){
  const map = new Map();
  for(const entry of state.planner){
    const r = state.recipes.find(x=>x.id===entry.id);
    if(r){
      for(const ing of r.ingredients){
        // skip placeholder "choose side" ingredients; actual side ingredients are added below when a side is selected
        if(typeof ing.item === 'string' && ing.item.toLowerCase().includes('choose side')) continue;
        if(typeof ing.unit === 'string' && ing.unit.toLowerCase() === 'choice') continue;
        const key = `${ing.item}__${ing.unit}`.toLowerCase();
        const prev = map.get(key) || {item:ing.item, unit:ing.unit, qty:0};
        const q = Number(ing.qty) || 0;
        prev.qty = prev.qty + q;
        map.set(key, prev);
      }
    }
    if(entry.sideId){
      const side = state.sides.find(s=>s.id===entry.sideId);
      if(side){
        for(const ing of side.ingredients){
          const key = `${ing.item}__${ing.unit}`.toLowerCase();
          const prev = map.get(key) || {item:ing.item, unit:ing.unit, qty:0};
          const q = Number(ing.qty) || 0;
          prev.qty = prev.qty + q;
          map.set(key, prev);
        }
      }
    }
  }
  return Array.from(map.values());
}

function renderShopping(){
  const ul = $('#shopping-list');
  ul.innerHTML = '';
  const data = aggregateIngredients();
  if(data.length===0){
    $('#shopping-info').textContent = 'No items — add dinners to the planner to build the shopping list.';
  } else {
    $('#shopping-info').textContent = `Aggregated ingredients (${data.length} items).`;
  }
  data.forEach(i=>{
    const li = document.createElement('li');
    li.textContent = `${i.qty} ${i.unit} ${i.item}`;
    ul.appendChild(li);
  });
}

function updateHashFromPlanner(){
  const tokens = state.planner.map(e=> e.id + (e.sideId ? '~' + e.sideId : ''));
  const ids = tokens.join(',');
  if(ids) location.hash = `selected=${ids}`;
  else history.replaceState(null,'',location.pathname+location.search);
}

function loadPlannerFromHash(){
  const h = location.hash.replace('#','');
  if(!h) return;
  const m = h.match(/selected=([^&]+)/);
  if(m){
    const tokens = m[1].split(',').filter(Boolean);
    state.planner = tokens.map(t=>{
      const parts = t.split('~');
      return { uid: Date.now().toString(36) + Math.random().toString(36).slice(2), id: parts[0], sideId: parts[1] || null };
    });
  }
}

function copyShareLink(){
  const link = location.href;
  navigator.clipboard.writeText(link).then(()=>{
    alert('Share link copied to clipboard');
  }, ()=>{
    prompt('Copy this link', link);
  });
}

function setupTabs(){
  const tabs = $all('.tab-btn');
  tabs.forEach(btn=>btn.addEventListener('click', ()=>{
    const name = btn.dataset.tab;
    showTab(name);
  }));
  // show recipes by default
  showTab('recipes');
}

function showTab(name){
  $all('.tab').forEach(t=>t.hidden = true);
  const el = $(`#${name}`);
  if(el) el.hidden = false;
}

async function init(){
  await Promise.all([loadRecipes(), loadSides()]);
  loadPlannerFromHash();
  renderRecipes();
  renderPlanner();
  renderShopping();
  setupTabs();

  // wire buttons
  $('#clear-planner').addEventListener('click', ()=>{ state.planner = []; renderPlanner(); renderShopping(); updateHashFromPlanner(); });
  $('#copy-link').addEventListener('click', copyShareLink);
  $('#print-list').addEventListener('click', ()=>window.print());
  $('#modal-cancel').addEventListener('click', ()=> closeModal());
  // clicking outside modal content closes it
  document.getElementById('side-modal').addEventListener('click', (e)=>{ if(e.target.id==='side-modal') closeModal(); });

  // when hash changes (e.g., user opens shared link)
  window.addEventListener('hashchange', ()=>{ loadPlannerFromHash(); renderPlanner(); renderShopping(); });
}

init();

// --- Manage recipes functionality ---
function managedKey(){ return 'managedRecipes_v1' }

function loadManaged(){
  try{
    const raw = localStorage.getItem(managedKey());
    state.managed = raw ? JSON.parse(raw) : [];
  }catch(e){ state.managed = []; }
  // apply managed overlays: replace by id or append
  const base = state.recipes.slice();
  const merged = base.slice();
  state.managed.forEach(m=>{
    const idx = merged.findIndex(x=>x.id===m.id);
    if(idx>=0) merged[idx] = m; else merged.push(m);
  });
  state._renderedRecipes = merged;
}

function saveManaged(){
  localStorage.setItem(managedKey(), JSON.stringify(state.managed));
  loadManaged();
}

function initManage(){
  loadManaged();
  renderManageList();
  setupManageEditor();
}

function renderManageList(){
  loadManaged();
  const ul = $('#manage-list');
  if(!ul) return;
  ul.innerHTML = '';
  const recipesToShow = state._renderedRecipes || state.recipes;
  recipesToShow.forEach(r=>{
    const li = document.createElement('li');
    li.innerHTML = `<span>${r.name}</span><div><button class="edit">Edit</button> <button class="delete">Delete</button></div>`;
    li.querySelector('.edit').addEventListener('click', ()=> openEditor(r));
    li.querySelector('.delete').addEventListener('click', ()=>{ if(confirm('Delete this managed recipe?')){
      const idx = state.managed.findIndex(m=>m.id===r.id);
      if(idx>-1) state.managed.splice(idx,1); saveManaged(); renderManageList(); renderRecipes(); renderPlanner(); renderShopping(); }
    });
    ul.appendChild(li);
  });
}

function setupManageEditor(){
  const newBtn = document.getElementById('new-recipe'); if(newBtn) newBtn.addEventListener('click', ()=> openEditor(null));
  const addIng = document.getElementById('add-ingredient'); if(addIng) addIng.addEventListener('click', ()=> addIngredientRow());
  const saveBtn = document.getElementById('save-recipe'); if(saveBtn) saveBtn.addEventListener('click', saveEditor);
  const cancelBtn = document.getElementById('cancel-edit'); if(cancelBtn) cancelBtn.addEventListener('click', ()=>{ clearEditor(); showTab('recipes'); });
  const exportBtn = document.getElementById('export-recipes'); if(exportBtn) exportBtn.addEventListener('click', ()=>{
    const data = JSON.stringify(state.managed, null, 2);
    const blob = new Blob([data], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'managed-recipes.json'; a.click(); URL.revokeObjectURL(url);
  });
  const importBtn = document.getElementById('import-recipes'); if(importBtn) importBtn.addEventListener('click', ()=> document.getElementById('import-file').click());
  const importFile = document.getElementById('import-file'); if(importFile) importFile.addEventListener('change', (e)=>{
    const f = e.target.files[0]; if(!f) return; const r = new FileReader(); r.onload = ()=>{
      try{ const imported = JSON.parse(r.result); if(Array.isArray(imported)){ state.managed = imported; saveManaged(); renderManageList(); renderRecipes(); } else alert('Invalid import format'); }catch(err){ alert('Failed to import JSON'); }
    }; r.readAsText(f);
  });
}

function addIngredientRow(data){
  const container = document.getElementById('ingredients-editor'); if(!container) return;
  const row = document.createElement('div'); row.className = 'ing-row';
  row.innerHTML = `<input class="ing-item" placeholder="item" value="${data ? (data.item||'') : ''}"> <input class="ing-qty" placeholder="qty" value="${data ? (data.qty||'') : ''}" style="width:80px"> <input class="ing-unit" placeholder="unit" value="${data ? (data.unit||'') : ''}" style="width:80px"> <button class="remove-ing">×</button>`;
  row.querySelector('.remove-ing').addEventListener('click', ()=> row.remove());
  container.appendChild(row);
}

function openEditor(recipe){
  const title = document.getElementById('editor-title'); if(title) title.textContent = recipe ? `Edit: ${recipe.name}` : 'New Recipe';
  document.getElementById('editor-name').value = recipe ? recipe.name : '';
  const ingContainer = document.getElementById('ingredients-editor'); ingContainer.innerHTML = '';
  if(recipe && Array.isArray(recipe.ingredients)) recipe.ingredients.forEach(i=>addIngredientRow(i)); else addIngredientRow();
  const sidesBox = document.getElementById('sides-checkboxes'); sidesBox.innerHTML = '';
  state.sides.forEach(s=>{
    const id = `sidecb_${s.id}`;
    const lab = document.createElement('label');
    lab.innerHTML = `<input type="checkbox" id="${id}" value="${s.id}"> ${s.name}`;
    sidesBox.appendChild(lab);
  });
  if(recipe && recipe.sides) recipe.sides.forEach(sid=>{ const cb = document.getElementById(`sidecb_${sid}`); if(cb) cb.checked = true; });
  document.getElementById('manage-editor').dataset.editId = recipe ? recipe.id : '';
  showTab('manage');
}

function clearEditor(){
  const title = document.getElementById('editor-title'); if(title) title.textContent = 'New Recipe';
  document.getElementById('editor-name').value = '';
  document.getElementById('ingredients-editor').innerHTML = '';
  addIngredientRow();
  document.getElementById('sides-checkboxes').innerHTML = '';
  document.getElementById('manage-editor').dataset.editId = '';
}

function saveEditor(){
  const id = document.getElementById('manage-editor').dataset.editId || ('r' + Date.now().toString(36));
  const name = document.getElementById('editor-name').value.trim();
  if(!name){ alert('Name required'); return; }
  const ingRows = Array.from(document.querySelectorAll('#ingredients-editor .ing-row'));
  const ingredients = ingRows.map(r=>({ item: r.querySelector('.ing-item').value.trim(), qty: r.querySelector('.ing-qty').value.trim(), unit: r.querySelector('.ing-unit').value.trim() })).filter(i=>i.item);
  const sides = Array.from(document.querySelectorAll('#sides-checkboxes input[type=checkbox]:checked')).map(cb=>cb.value);
  const obj = { id, name, ingredients, sides };
  const idx = state.managed.findIndex(m=>m.id===id);
  if(idx>-1) state.managed[idx] = obj; else state.managed.push(obj);
  saveManaged();
  clearEditor();
  renderManageList(); renderRecipes();
  alert('Saved');
}
