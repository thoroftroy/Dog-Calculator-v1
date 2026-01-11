/* ==========================================================
    Dog Breeding Calculator
   ========================================================== */

let GAME_DATA = null;

/** Utility: format integers as money like $1,234 */
function money(n){
  const val = Math.round(Number(n) || 0);
  return "$" + val.toLocaleString("en-US");
}

/** Decide which sell tier index applies given groom/train toggles.
    Tier indices: 0=base, 1=groomed, 2=trained, 3=both */
function getTierIndex(groom, train){
  if (groom && train) return 3;
  if (groom) return 1;
  if (train) return 2;
  return 0;
}

/** Create a DOM element with optional className and text */
function el(tag, className, text){
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** Loads the JSON dictionary file. Keep it separate for easy editing. */
async function loadData(){
  const res = await fetch("./data.json");
  if (!res.ok) throw new Error("Failed to load data.json");
  return res.json();
}

/** Creates one calculator card and wires its events. */
function createCard(cardIndex, defaultBreedId = "mutt"){
  // ---- Card skeleton ----
  const card = el("div", "card");

  const header = el("div", "card-header");
  const badge = el("div", "card-badge");
  badge.appendChild(el("span", "badge-dot"));
  badge.appendChild(el("span", "", `Calculator #${cardIndex}`));

  const headerRight = el("div", "");
  const removeBtn = el("button", "remove-btn", "Remove");
  headerRight.appendChild(removeBtn);

  header.appendChild(badge);
  header.appendChild(headerRight);

  const body = el("div", "card-body");

  // ---- Left panel (options) ----
  const options = el("div", "panel");
  options.appendChild(el("h3", "", "Options"));

  // Breed select (top-right in your sketch; here it sits first in options)
  const breedRow = el("div", "row");
  const breedLabel = el("label", "", "Breed");
  breedLabel.style.minWidth = "70px";

  const breedSelect = el("select");
  // Populate breeds
  Object.values(GAME_DATA.breeds).forEach(b => {
    const opt = document.createElement("option");
    opt.value = b.id;
    opt.textContent = b.name;
    breedSelect.appendChild(opt);
  });
  breedSelect.value = defaultBreedId;

  breedRow.appendChild(breedLabel);
  breedRow.appendChild(breedSelect);
  options.appendChild(breedRow);

  // Groom / Train checkboxes
  const actionRow = el("div", "row");
  actionRow.appendChild(el("label", "", "Actions"));
  const checks = el("div", "checks");

  const groomWrap = el("label", "check");
  const groomBox = document.createElement("input");
  groomBox.type = "checkbox";
  groomWrap.appendChild(groomBox);
  groomWrap.appendChild(el("span", "", "Groom"));

  const trainWrap = el("label", "check");
  const trainBox = document.createElement("input");
  trainBox.type = "checkbox";
  trainWrap.appendChild(trainBox);
  trainWrap.appendChild(el("span", "", "Train"));

  checks.appendChild(groomWrap);
  checks.appendChild(trainWrap);
  actionRow.appendChild(checks);
  options.appendChild(actionRow);

  // Puppies count
  const pupRow = el("div", "row");
  const pupLabel = el("label", "", "Puppies");
  pupLabel.style.minWidth = "70px";

  const pupInput = document.createElement("input");
  pupInput.type = "number";
  pupInput.min = "1";
  pupInput.max = "12";
  pupInput.step = "1";
  pupInput.value = "1";

  pupRow.appendChild(pupLabel);
  pupRow.appendChild(pupInput);
  options.appendChild(pupRow);

  // Small note about global config (boardgame reminder)
  const note = el(
    "div",
    "footer-note",
    "Costs are calculated per puppy. Pound + taxes are shown as per-puppy and totals."
  );
  options.appendChild(note);

  // ---- Middle panel (cost outputs) ----
  const mid = el("div", "kpi");

  const costBox = el("div", "kpi-box");
  costBox.appendChild(el("div", "kpi-title", "Action Cost (total)"));
  const costMoney = el("div", "money warn", "$0");
  const costSplit = el("div", "split");
  const costPer = el("div", "", "Per puppy: $0");
  const costBreak = el("div", "", "Groom: $0 | Train: $0");
  costSplit.appendChild(costPer);
  costSplit.appendChild(costBreak);
  costBox.appendChild(costMoney);
  costBox.appendChild(costSplit);

  const poundBox = el("div", "kpi-box");
  poundBox.appendChild(el("div", "kpi-title", "Pound Cost (per day)"));
  const poundMoney = el("div", "money bad", "$0");
  const poundSplit = el("div", "split");
  const poundPer = el("div", "", "Per puppy/day: $0");
  const poundTypes = el("div", "", "Dog: $0 | Puppy: $0");
  poundSplit.appendChild(poundPer);
  poundSplit.appendChild(poundTypes);
  poundBox.appendChild(poundMoney);
  poundBox.appendChild(poundSplit);

  mid.appendChild(costBox);
  mid.appendChild(poundBox);

  // ---- Right panel (sell + taxes) ----
  const right = el("div", "kpi");

  const sellBox = el("div", "kpi-box");
  sellBox.appendChild(el("div", "kpi-title", "Sell Value"));
  const sellMoney = el("div", "money good", "$0");
  const sellSplit = el("div", "split");
  const sellPer = el("div", "", "Per puppy: $0");
  const sellTier = el("div", "", "Tier: Base");
  sellSplit.appendChild(sellPer);
  sellSplit.appendChild(sellTier);
  sellBox.appendChild(sellMoney);
  sellBox.appendChild(sellSplit);

  const taxBox = el("div", "kpi-box");
  taxBox.appendChild(el("div", "kpi-title", "Taxes (total)"));
  const taxMoney = el("div", "money warn", "$0");
  const taxSplit = el("div", "split");
  const taxPer = el("div", "", "Per puppy: $0");
  const taxHint = el("div", "", "");
  taxSplit.appendChild(taxPer);
  taxSplit.appendChild(taxHint);
  taxBox.appendChild(taxMoney);
  taxBox.appendChild(taxSplit);

  right.appendChild(sellBox);
  right.appendChild(taxBox);

  // Assemble body
  body.appendChild(options);
  body.appendChild(mid);
  body.appendChild(right);

  card.appendChild(header);
  card.appendChild(body);

  // ---- Calculator logic ----

  function applyMuttRules(breed){
    const isMutt = !!breed.isMutt;
    // Disable + grey out grooming/training UI when mutt
    groomWrap.classList.toggle("disabled", isMutt);
    trainWrap.classList.toggle("disabled", isMutt);

    if (isMutt){
      groomBox.checked = false;
      trainBox.checked = false;
    }
  }

  function getTierName(groom, train){
    if (groom && train) return "Groomed + Trained";
    if (groom) return "Groomed";
    if (train) return "Trained";
    return "Base";
  }

  function recalc(){
    const breedId = breedSelect.value;
    const breed = GAME_DATA.breeds[breedId];
    if (!breed) return;

    applyMuttRules(breed);

    const puppies = Math.max(1, Math.min(12, parseInt(pupInput.value || "1", 10)));

    // If mutt, grooming/training is forced off already
    const groom = !!groomBox.checked;
    const train = !!trainBox.checked;

    // ---------- Action cost ----------
    const groomCostPer = groom ? (breed.groomCost || 0) : 0;
    const trainCostPer = train ? (breed.trainCost || 0) : 0;
    const actionCostPer = groomCostPer + trainCostPer;
    const actionCostTotal = actionCostPer * puppies;

    // ---------- Sell value ----------
    let sellPerPuppy = 0;
    if (breed.isMutt && typeof breed.fixedSell === "number"){
      sellPerPuppy = breed.fixedSell;
    } else {
      const tier = getTierIndex(groom, train);
      sellPerPuppy = (breed.sellTiers && breed.sellTiers[tier]) ? breed.sellTiers[tier] : 0;
    }
    const sellTotal = sellPerPuppy * puppies;

    // ---------- Pound + taxes ----------
    const dogPoundPerDay = Number(GAME_DATA.config.dogPoundPerDay || 0);
    const puppyPoundPerDay = Number(GAME_DATA.config.puppyPoundPerDay || 0);
    const taxPerPuppy = Number(GAME_DATA.config.taxPerPuppy || 0);

    // For this card (puppy-focused), we show puppy pound totals.
    const poundPerPuppyPerDay = puppyPoundPerDay;
    const poundTotalPerDay = poundPerPuppyPerDay * puppies;

    const taxesTotal = taxPerPuppy * puppies;

    // ---------- Paint UI ----------
    costMoney.textContent = money(actionCostTotal);
    costPer.textContent = `Per puppy: ${money(actionCostPer)}`;
    costBreak.textContent = `Groom: ${money(groomCostPer)} | Train: ${money(trainCostPer)}`;

    poundMoney.textContent = money(poundTotalPerDay);
    poundPer.textContent = `Per puppy/day: ${money(poundPerPuppyPerDay)}`;
    poundTypes.textContent = `Dog: ${money(dogPoundPerDay)} | Puppy: ${money(puppyPoundPerDay)}`;

    sellMoney.textContent = money(sellTotal);
    sellPer.textContent = `Per puppy: ${money(sellPerPuppy)}`;
    sellTier.textContent = `Tier: ${getTierName(groom, train)}`;

    taxMoney.textContent = money(taxesTotal);
    taxPer.textContent = `Per puppy: ${money(taxPerPuppy)}`;
    taxHint.textContent = ``;
  }

  // Wire events
  breedSelect.addEventListener("change", recalc);
  groomBox.addEventListener("change", recalc);
  trainBox.addEventListener("change", recalc);
  pupInput.addEventListener("input", recalc);

  // Remove card
  removeBtn.addEventListener("click", () => {
    // Don’t allow removing the last card (optional); currently allowed.
    card.remove();
  });

  // Initial calculation
  recalc();

  return card;
}

/** Adds a new card to the container. */
function addCard(defaultBreedId = "mutt"){
  const container = document.getElementById("cards");
  const idx = container.children.length + 1;
  const card = createCard(idx, defaultBreedId);
  container.appendChild(card);
  // Scroll the new card into view
  card.scrollIntoView({ behavior: "smooth", block: "start" });
}

/** Main app entry */
async function main(){
  GAME_DATA = await loadData();

  // First card must start as mutt
  addCard("mutt");

  // Hook up plus button
  document.getElementById("addCardBtn").addEventListener("click", () => {
    addCard("mutt"); // new cards default to mutt; change if you prefer
  });
}

main().catch(err => {
  console.error(err);
  alert("Failed to load app. Check console. Make sure data.json is next to index.html.");
});
