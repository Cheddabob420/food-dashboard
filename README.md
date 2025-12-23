Weekly Dinner Planner

Files created:

- index.html — single file app with tabs (Recipes, Planner, Shopping List)
- styles.css — basic styling
- app.js — app logic: load recipes, add/remove planner items, aggregate shopping list, share & print
- recipes.json — sample recipes data

How to try it

Open `index.html` in your browser (double-click or serve via a simple static server):

```bash
# from the project folder
python3 -m http.server 8000
# then open http://localhost:8000
```

Share a planner: click "Copy Share Link" on the Shopping List tab and send the URL — opening it restores the selected dinners.

Next steps (I can do):
- Add per-day planner UI (assign dinners to weekdays)
- Save planner to localStorage or export/import as JSON
- Add editable quantities and unit conversions

Deploy to GitHub
----------------

You can publish this site with GitHub Pages. Quick steps:

1. Create a GitHub repository (on github.com) and note the repo URL.
2. On your machine, add the remote and push:

```bash
git remote add origin git@github.com:YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

3. Enable GitHub Pages in the repository settings: set source to `main` branch and `/ (root)`.

Alternative (with `gh` CLI):

```bash
gh repo create YOUR_REPO --public --source=. --remote=origin --push
gh repo view --web
```

If you want, I can push the repo for you now — let me know if you have `gh` configured or want to provide the remote URL.
