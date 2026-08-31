import "dotenv/config";
import { db } from "../src/lib/db";

// Grille d'évaluation de l'OFFRE TECHNIQUE (110 pts) — Section III du DAO.
// La somme des maxPoints doit être égale à 110.
const criteres = [
  { nom: "Qualité de présentation du dossier", description: "Ordre des documents, intercalaires en couleur, agencement. Passable 1 / Moyen 1,5 / Bon 2", maxPoints: 2 },
  { nom: "Expérience générale", description: "Références de projets équivalents : 1 projet = 2, 2 à 5 projets = 10, 6 projets et + = 15", maxPoints: 15 },
  { nom: "Chiffre d'affaires", description: "Somme des CA des 5 dernières années : < 4 M€ = 2, 4 à 8 M€ = 4, > 8 M€ = 6", maxPoints: 6 },
  { nom: "Certificat de solvabilité", description: "Ligne de crédit : 4 à < 6 M€ = 2, 6 à 10 M€ = 4, > 10 M€ = 6", maxPoints: 6 },
  { nom: "Qualifications", description: "Certificat de qualification bâtiment/TP : moyen 2 / bon 3 / excellent 6", maxPoints: 6 },
  { nom: "Certifications", description: "Certifications internationales : 1 = 1, 2 à 3 = 2, > 3 = 3", maxPoints: 3 },
  { nom: "Moyens humains", description: "Personnel d'encadrement (directeur, chef de projet, QA, HSE, planification, BIM, conducteurs, topographes, laborantins, métreurs)", maxPoints: 20 },
  { nom: "Moyens matériels et équipements", description: "Matériel roulant et non roulant : moyen 2 / bon 5 / excellent 10", maxPoints: 10 },
  { nom: "Délai global des travaux et planification", description: "Planning par lot et bâtiment. Le délai le plus court = 15 pts, les autres : 15 x DPC / délai proposé", maxPoints: 15 },
  { nom: "Délais de garantie", description: "Garantie équipements électromécaniques : 24 mois = 1, 25 à 36 mois = 2, > 36 mois = 3", maxPoints: 3 },
  { nom: "Délai d'entretien après réception définitive", description: "Service après-vente : 12 mois = 1, 13 à 24 mois = 3, > 24 mois = 5", maxPoints: 5 },
  { nom: "Expérience zones sahariennes et sub-sahariennes", description: "1 projet = 1, 3 projets = 2, plus de 3 projets = 4", maxPoints: 4 },
  { nom: "Mémoire technique (méthodologie)", description: "Organisation, planning, démolition, procédés, personnel, plan QHSE, sécurité, environnement, variantes. Moyen 3 / Bon 7 / Excellent 15", maxPoints: 15 },
];

async function main() {
  for (const c of criteres) {
    const existing = await db.critere.findUnique({ where: { nom: c.nom } });
    if (existing) {
      await db.critere.update({
        where: { id: existing.id },
        data: { description: c.description, maxPoints: c.maxPoints },
      });
    } else {
      await db.critere.create({
        data: { nom: c.nom, description: c.description, maxPoints: c.maxPoints },
      });
    }
  }

  const all = await db.critere.findMany({ orderBy: { id: "asc" } });
  const total = all.reduce((s, c) => s + c.maxPoints, 0);
  console.log(JSON.stringify(all, null, 1));
  console.log(`\nTotal maxPoints (offre technique) : ${total}`);
  await db.$disconnect();
}

main();
