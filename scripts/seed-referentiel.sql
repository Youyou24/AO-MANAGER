-- Grille OFFRE TECHNIQUE (110 pts) - Section III du DAO
SET NOCOUNT ON;
DECLARE @tbl TABLE (nom NVARCHAR(1000), description NVARCHAR(1000), maxPoints FLOAT(53));
INSERT INTO @tbl (nom, description, maxPoints) VALUES
(N'Qualité de présentation du dossier', N'Ordre des documents, intercalaires en couleur, agencement. Passable 1 / Moyen 1,5 / Bon 2', 2),
(N'Expérience générale', N'Références de projets équivalents : 1 projet = 2, 2 à 5 projets = 10, 6 projets et + = 15', 15),
(N'Chiffre d''affaires', N'Somme des CA des 5 dernières années : < 4 M€ = 2, 4 à 8 M€ = 4, > 8 M€ = 6', 6),
(N'Certificat de solvabilité', N'Ligne de crédit : 4 à < 6 M€ = 2, 6 à 10 M€ = 4, > 10 M€ = 6', 6),
(N'Qualifications', N'Certificat de qualification bâtiment/TP : moyen 2 / bon 3 / excellent 6', 6),
(N'Certifications', N'Certifications internationales : 1 = 1, 2 à 3 = 2, > 3 = 3', 3),
(N'Moyens humains', N'Personnel d''encadrement (directeur, chef de projet, QA, HSE, planification, BIM, conducteurs, topographes, laborantins, métreurs)', 20),
(N'Moyens matériels et équipements', N'Matériel roulant et non roulant : moyen 2 / bon 5 / excellent 10', 10),
(N'Délai global des travaux et planification', N'Planning par lot et bâtiment. Le délai le plus court = 15 pts, les autres : 15 x DPC / délai proposé', 15),
(N'Délais de garantie', N'Garantie équipements électromécaniques : 24 mois = 1, 25 à 36 mois = 2, > 36 mois = 3', 3),
(N'Délai d''entretien après réception définitive', N'Service après-vente : 12 mois = 1, 13 à 24 mois = 3, > 24 mois = 5', 5),
(N'Expérience zones sahariennes et sub-sahariennes', N'1 projet = 1, 3 projets = 2, plus de 3 projets = 4', 4),
(N'Mémoire technique (méthodologie)', N'Organisation, planning, démolition, procédés, personnel, plan QHSE, sécurité, environnement, variantes. Moyen 3 / Bon 7 / Excellent 15', 15);

MERGE INTO [dbo].[Critere] AS t
USING @tbl AS s ON t.nom = s.nom
WHEN MATCHED THEN UPDATE SET t.description = s.description, t.maxPoints = s.maxPoints
WHEN NOT MATCHED BY TARGET THEN INSERT (nom, description, maxPoints, createdAt) VALUES (s.nom, s.description, s.maxPoints, CURRENT_TIMESTAMP);

SELECT id, nom, maxPoints FROM [dbo].[Critere] ORDER BY id;
SELECT CONCAT('Total maxPoints (offre technique) : ', SUM(maxPoints)) AS total FROM [dbo].[Critere];
