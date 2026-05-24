'use strict';

/* === CONSTANTES === */
const CLE_STORAGE = 'budget_transactions';

const CATEGORIES = ['alimentation', 'logement', 'transport', 'loisirs', 'santé', 'autres'];

const COULEURS_CHART = ['#e67e22', '#3498db', '#1565c0', '#1abc9c', '#e74c3c', '#95a5a6'];

/* === ÉTAT === */
const etat = {
  transactions: chargerTransactions(),
  filtres: { type: 'tous', categorie: 'toutes', mois: '' }
};

let instanceChart = null;

/* === DONNÉES (fonctions pures) === */

function chargerTransactions() {
  try {
    return JSON.parse(localStorage.getItem(CLE_STORAGE)) || [];
  } catch {
    return [];
  }
}

function sauvegarderTransactions(transactions) {
  localStorage.setItem(CLE_STORAGE, JSON.stringify(transactions));
}

function ajouterTransaction({ type, montant, categorie, date, description }) {
  const transaction = {
    id: Date.now().toString(),
    type,
    montant: parseFloat(montant),
    categorie,
    date,
    description: description.trim()
  };
  const transactions = [...etat.transactions, transaction];
  sauvegarderTransactions(transactions);
  return transactions;
}

function supprimerTransaction(id) {
  const transactions = etat.transactions.filter(t => t.id !== id);
  sauvegarderTransactions(transactions);
  return transactions;
}

function calculerBilan(transactions) {
  return transactions.reduce(
    (acc, t) => {
      if (t.type === 'revenu') {
        acc.totalRevenus += t.montant;
        acc.solde += t.montant;
      } else {
        acc.totalDepenses += t.montant;
        acc.solde -= t.montant;
      }
      return acc;
    },
    { solde: 0, totalRevenus: 0, totalDepenses: 0 }
  );
}

function appliquerFiltres(transactions) {
  return transactions
    .filter(t => etat.filtres.type === 'tous' || t.type === etat.filtres.type)
    .filter(t => etat.filtres.categorie === 'toutes' || t.categorie === etat.filtres.categorie)
    .filter(t => !etat.filtres.mois || t.date.startsWith(etat.filtres.mois));
}

/* === HELPERS === */

function formaterMontant(n) {
  return n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
}

function formaterDate(dateISO) {
  const [y, m, d] = dateISO.split('-');
  return `${d}/${m}/${y}`;
}

function aujourdhuiISO() {
  return new Date().toISOString().split('T')[0];
}

/* === INITIALISATION === */

function initialiserFormulaire() {
  const form = document.getElementById('form-transaction');
  const champDate = document.getElementById('champ-date');
  champDate.value = aujourdhuiISO();

  form.addEventListener('submit', e => {
    e.preventDefault();
    if (!validerFormulaire()) return;

    etat.transactions = ajouterTransaction({
      type: document.getElementById('champ-type').value,
      montant: document.getElementById('champ-montant').value,
      categorie: document.getElementById('champ-categorie').value,
      date: document.getElementById('champ-date').value,
      description: document.getElementById('champ-description').value
    });

    rafraichirUI();
    form.reset();
    champDate.value = aujourdhuiISO();
  });
}

function validerFormulaire() {
  let valide = true;

  const champMontant = document.getElementById('champ-montant');
  const erreurMontant = document.getElementById('erreur-montant');
  const montant = parseFloat(champMontant.value);

  if (!champMontant.value || isNaN(montant) || montant <= 0) {
    champMontant.classList.add('champ-erreur');
    erreurMontant.textContent = 'Entrez un montant valide supérieur à 0.';
    valide = false;
  } else {
    champMontant.classList.remove('champ-erreur');
    erreurMontant.textContent = '';
  }

  const champCategorie = document.getElementById('champ-categorie');
  const erreurCategorie = document.getElementById('erreur-categorie');

  if (!champCategorie.value) {
    champCategorie.classList.add('champ-erreur');
    erreurCategorie.textContent = 'Veuillez choisir une catégorie.';
    valide = false;
  } else {
    champCategorie.classList.remove('champ-erreur');
    erreurCategorie.textContent = '';
  }

  return valide;
}

function initialiserChart() {
  const ctx = document.getElementById('chart-categories').getContext('2d');
  instanceChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: [],
      datasets: [{
        data: [],
        backgroundColor: COULEURS_CHART,
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            font: { size: 11 },
            padding: 12,
            boxWidth: 12
          }
        },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.label} : ${formaterMontant(ctx.raw)}`
          }
        }
      }
    }
  });
}

function initialiserFiltres() {
  const selectCategorie = document.getElementById('filtre-categorie');
  CATEGORIES.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat.charAt(0).toUpperCase() + cat.slice(1);
    selectCategorie.appendChild(opt);
  });

  document.getElementById('filtre-type').addEventListener('change', e => {
    etat.filtres.type = e.target.value;
    rafraichirUI();
  });

  selectCategorie.addEventListener('change', e => {
    etat.filtres.categorie = e.target.value;
    rafraichirUI();
  });

  document.getElementById('filtre-mois').addEventListener('change', e => {
    etat.filtres.mois = e.target.value;
    rafraichirUI();
  });

  document.getElementById('btn-reinitialiser-filtres').addEventListener('click', () => {
    etat.filtres = { type: 'tous', categorie: 'toutes', mois: '' };
    document.getElementById('filtre-type').value = 'tous';
    document.getElementById('filtre-categorie').value = 'toutes';
    document.getElementById('filtre-mois').value = '';
    rafraichirUI();
  });
}

function initialiserHistorique() {
  document.getElementById('liste-transactions').addEventListener('click', e => {
    const btn = e.target.closest('.btn-supprimer');
    if (!btn) return;
    if (!confirm('Supprimer cette transaction ?')) return;
    etat.transactions = supprimerTransaction(btn.dataset.id);
    rafraichirUI();
  });
}

/* === RENDU === */

function mettreAJourBilan(transactions) {
  const { solde, totalRevenus, totalDepenses } = calculerBilan(transactions);

  const valeurSolde = document.querySelector('#carte-solde .valeur');
  valeurSolde.textContent = formaterMontant(solde);
  valeurSolde.className = 'valeur ' + (solde >= 0 ? 'positif' : 'negatif');

  document.querySelector('#carte-revenus .valeur').textContent = formaterMontant(totalRevenus);
  document.querySelector('#carte-depenses .valeur').textContent = formaterMontant(totalDepenses);

  const badge = document.getElementById('badge-solde');
  badge.textContent = formaterMontant(solde);
  badge.className = 'badge-solde ' + (solde >= 0 ? 'positif' : 'negatif');
}

function mettreAJourChart(transactions) {
  const depenses = transactions.filter(t => t.type === 'depense');

  if (depenses.length === 0) {
    instanceChart.data.labels = ['Aucune dépense'];
    instanceChart.data.datasets[0].data = [1];
    instanceChart.data.datasets[0].backgroundColor = ['#e0e0e0'];
    instanceChart.update();
    return;
  }

  const totauxParCategorie = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = 0;
    return acc;
  }, {});

  depenses.forEach(t => {
    if (totauxParCategorie[t.categorie] !== undefined) {
      totauxParCategorie[t.categorie] += t.montant;
    }
  });

  const labels = [];
  const data = [];
  const couleurs = [];

  CATEGORIES.forEach((cat, i) => {
    if (totauxParCategorie[cat] > 0) {
      labels.push(cat.charAt(0).toUpperCase() + cat.slice(1));
      data.push(Math.round(totauxParCategorie[cat] * 100) / 100);
      couleurs.push(COULEURS_CHART[i]);
    }
  });

  instanceChart.data.labels = labels;
  instanceChart.data.datasets[0].data = data;
  instanceChart.data.datasets[0].backgroundColor = couleurs;
  instanceChart.update();
}

function rendreListeTransactions(transactions) {
  const liste = document.getElementById('liste-transactions');

  const filtrees = appliquerFiltres(transactions)
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));

  if (filtrees.length === 0) {
    liste.innerHTML = '<li class="vide">Aucune transaction trouvée.</li>';
    return;
  }

  liste.innerHTML = filtrees.map(t => `
    <li class="transaction-item ${t.type}" data-id="${t.id}">
      <div class="transaction-infos">
        <span class="transaction-date">${formaterDate(t.date)}</span>
        <span class="transaction-description">${t.description || '—'}</span>
        <span class="transaction-categorie">${t.categorie}</span>
      </div>
      <div class="transaction-droite">
        <span class="montant ${t.type}">${t.type === 'depense' ? '−' : '+'}${formaterMontant(t.montant)}</span>
        <button class="btn-supprimer" data-id="${t.id}" aria-label="Supprimer">✕</button>
      </div>
    </li>
  `).join('');
}

/* === ORCHESTRATION === */

function rafraichirUI() {
  mettreAJourBilan(etat.transactions);
  mettreAJourChart(etat.transactions);
  rendreListeTransactions(etat.transactions);
}

/* === DÉMARRAGE === */

document.addEventListener('DOMContentLoaded', () => {
  initialiserFormulaire();
  initialiserChart();
  initialiserFiltres();
  initialiserHistorique();
  rafraichirUI();
});
