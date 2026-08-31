-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "AppelOffre" (
    "id" SERIAL NOT NULL,
    "titre" TEXT NOT NULL,
    "reference" TEXT,
    "description" TEXT,
    "dateLimite" TIMESTAMP(3),
    "statut" TEXT NOT NULL DEFAULT 'brouillon',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppelOffre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Entreprise" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "secteur" TEXT,
    "contact" TEXT,
    "email" TEXT,
    "telephone" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Entreprise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Candidature" (
    "id" SERIAL NOT NULL,
    "appelOffreId" INTEGER NOT NULL,
    "entrepriseId" INTEGER NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'en_cours',
    "offreFinanciere" DOUBLE PRECISION,
    "cautionMontant" DOUBLE PRECISION,
    "dateDepot" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Candidature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" SERIAL NOT NULL,
    "nomFichier" TEXT NOT NULL,
    "cheminStocke" TEXT NOT NULL,
    "tailleOctets" INTEGER NOT NULL,
    "typeMime" TEXT,
    "categorie" TEXT NOT NULL DEFAULT 'autre',
    "appelOffreId" INTEGER NOT NULL,
    "entrepriseId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Critere" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "maxPoints" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Critere_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evaluation" (
    "id" SERIAL NOT NULL,
    "note" DOUBLE PRECISION NOT NULL,
    "commentaire" TEXT,
    "appelOffreId" INTEGER NOT NULL,
    "entrepriseId" INTEGER NOT NULL,
    "critereId" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Evaluation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AppelOffre_titre_key" ON "AppelOffre"("titre");

-- CreateIndex
CREATE UNIQUE INDEX "Entreprise_nom_key" ON "Entreprise"("nom");

-- CreateIndex
CREATE INDEX "Candidature_appelOffreId_idx" ON "Candidature"("appelOffreId");

-- CreateIndex
CREATE INDEX "Candidature_entrepriseId_idx" ON "Candidature"("entrepriseId");

-- CreateIndex
CREATE UNIQUE INDEX "Candidature_appelOffreId_entrepriseId_key" ON "Candidature"("appelOffreId", "entrepriseId");

-- CreateIndex
CREATE INDEX "Document_appelOffreId_entrepriseId_idx" ON "Document"("appelOffreId", "entrepriseId");

-- CreateIndex
CREATE INDEX "Document_entrepriseId_idx" ON "Document"("entrepriseId");

-- CreateIndex
CREATE UNIQUE INDEX "Critere_nom_key" ON "Critere"("nom");

-- CreateIndex
CREATE INDEX "Evaluation_appelOffreId_entrepriseId_idx" ON "Evaluation"("appelOffreId", "entrepriseId");

-- CreateIndex
CREATE UNIQUE INDEX "Evaluation_appelOffreId_entrepriseId_critereId_key" ON "Evaluation"("appelOffreId", "entrepriseId", "critereId");

-- AddForeignKey
ALTER TABLE "Candidature" ADD CONSTRAINT "Candidature_appelOffreId_fkey" FOREIGN KEY ("appelOffreId") REFERENCES "AppelOffre"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Candidature" ADD CONSTRAINT "Candidature_entrepriseId_fkey" FOREIGN KEY ("entrepriseId") REFERENCES "Entreprise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_appelOffreId_fkey" FOREIGN KEY ("appelOffreId") REFERENCES "AppelOffre"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_entrepriseId_fkey" FOREIGN KEY ("entrepriseId") REFERENCES "Entreprise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_appelOffreId_fkey" FOREIGN KEY ("appelOffreId") REFERENCES "AppelOffre"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_entrepriseId_fkey" FOREIGN KEY ("entrepriseId") REFERENCES "Entreprise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_critereId_fkey" FOREIGN KEY ("critereId") REFERENCES "Critere"("id") ON DELETE CASCADE ON UPDATE CASCADE;
