import type { Food, FoodCategory } from '@/domain/types';

/**
 * Base alimentaire locale (hors-ligne). Valeurs pour 100 g indicatives,
 * issues des tables publiques usuelles (CIQUAL/ANSES, USDA), arrondies.
 * Elles peuvent différer légèrement selon la marque : la recherche
 * Open Food Facts permet de saisir un produit précis.
 */

type P = { label: string; grams: number };
const P_ = (label: string, grams: number): P => ({ label, grams });
const f = (
  id: string,
  name: string,
  category: FoodCategory,
  [kcal, protein, carbs, fat, fiber = 0]: [number, number, number, number, number?],
  tags: string[] = [],
  portions: P[] = [],
  defaultGrams = 100,
): Food => ({ id, name, category, per100: { kcal, protein, carbs, fat, fiber }, tags, portions, defaultGrams, source: 'local' });

const A = 'animal';

export const SEED_FOODS: Food[] = [
  // ——— Viandes ———
  f('chicken_breast', 'Blanc de poulet (cru)', 'meat', [120, 22.5, 0, 2.6], [A, 'proteine', 'volume'], [P_('1 filet', 150)], 150),
  f('chicken_breast_cooked', 'Blanc de poulet cuit / rôti (tranché)', 'meat', [150, 28, 0, 3.5], [A, 'proteine'], [P_('1 tranche', 25)], 100),
  f('chicken_thigh', 'Haut de cuisse de poulet sans peau (cru)', 'meat', [125, 19, 0, 5.5], [A, 'proteine'], [P_('1 haut de cuisse', 110)], 150),
  f('turkey_escalope', 'Escalope de dinde (crue)', 'meat', [110, 23, 0, 1.5], [A, 'proteine'], [P_('1 escalope', 130)], 150),
  f('ground_beef_5', 'Steak haché 5 % (cru)', 'meat', [125, 21.5, 0, 5], [A, 'proteine'], [P_('1 steak', 125)], 150),
  f('ground_beef_10', 'Steak haché 10 % (cru)', 'meat', [170, 19.5, 0, 10], [A, 'proteine'], [P_('1 steak', 125)], 150),
  f('ground_beef_15', 'Steak haché 15 % (cru)', 'meat', [210, 18.5, 0, 15], [A], [P_('1 steak', 125)], 125),
  f('ground_beef_20', 'Steak haché 20 % (cru)', 'meat', [250, 17, 0, 20], [A], [P_('1 steak', 125)], 125),
  f('beef_steak', 'Steak de bœuf (rumsteck, cru)', 'meat', [130, 22, 0, 4.5], [A, 'proteine'], [P_('1 steak', 150)], 150),
  f('pork_tenderloin', 'Filet mignon de porc (cru)', 'meat', [115, 21, 0, 3], [A, 'pork', 'proteine'], [], 150),
  f('ham', 'Jambon blanc découenné dégraissé', 'meat', [110, 20, 1, 3], [A, 'pork', 'proteine'], [P_('1 tranche', 40)], 80),
  f('ham_std', 'Jambon blanc standard (avec couenne)', 'meat', [130, 19, 1, 6], [A, 'pork'], [P_('1 tranche', 45)], 90),
  f('bacon_lardons', 'Lardons fumés', 'meat', [290, 14, 0.5, 26], [A, 'pork'], [], 50),
  f('chicken_nuggets', 'Nuggets de poulet (surgelés)', 'meat', [250, 14, 17, 13], [A, 'gluten', 'plaisir'], [P_('1 nugget', 20)], 150),
  f('cordon_bleu', 'Cordon bleu', 'meat', [230, 15, 15, 12], [A, 'pork', 'gluten', 'plaisir'], [P_('1 pièce', 100)], 100),
  f('merguez', 'Merguez', 'meat', [290, 15, 1, 25], [A], [P_('1 merguez', 50)], 100),
  f('kebab_meat', 'Viande de kebab', 'meat', [240, 18, 2, 18], [A, 'plaisir'], [], 150),

  // ——— Poissons ———
  f('cod', 'Cabillaud / colin (cru)', 'fish', [80, 18, 0, 0.7], [A, 'proteine', 'volume'], [P_('1 filet', 150)], 150),
  f('salmon', 'Saumon (cru)', 'fish', [200, 20, 0, 13], [A, 'proteine'], [P_('1 pavé', 130)], 130),
  f('tuna_can', 'Thon au naturel (égoutté)', 'fish', [110, 25, 0, 1], [A, 'proteine'], [P_('1 boîte égouttée', 110)], 110),
  f('shrimp', 'Crevettes cuites décortiquées', 'fish', [95, 20, 0.5, 1.5], [A, 'proteine'], [], 150),
  f('smoked_salmon', 'Saumon fumé', 'fish', [180, 22, 0, 10], [A, 'proteine'], [P_('1 tranche', 30)], 60),
  f('surimi', 'Surimi', 'fish', [100, 8, 13, 2.5], [A, 'gluten'], [P_('1 bâtonnet', 17)], 85),
  f('fish_sticks', 'Bâtonnets de poisson panés', 'fish', [200, 12, 17, 9], [A, 'gluten', 'plaisir'], [P_('1 bâtonnet', 30)], 120),

  // ——— Œufs ———
  f('egg', 'Œuf entier', 'egg', [140, 12.5, 0.7, 10], [A, 'proteine'], [P_('1 œuf (M)', 55), P_('1 œuf (L)', 63)], 110),
  f('egg_white', 'Blanc d’œuf', 'egg', [50, 10.5, 0.7, 0.2], [A, 'proteine'], [P_('1 blanc', 33)], 100),

  // ——— Féculents ———
  f('rice_raw', 'Riz blanc (cru)', 'starch', [350, 7, 78, 0.7, 1.5], [], [P_('1 verre', 80)], 80),
  f('rice_cooked', 'Riz blanc cuit', 'starch', [130, 2.7, 28, 0.3, 0.4], ['volume'], [], 200),
  f('rice_brown_cooked', 'Riz complet cuit', 'starch', [110, 2.5, 23, 0.9, 1.8], ['volume'], [], 200),
  f('rice_microwave', 'Riz micro-ondes (sachet 2 min)', 'starch', [150, 3, 30, 1.5, 0.5], ['rapide'], [P_('1 sachet', 250)], 250),
  f('pasta_raw', 'Pâtes (crues)', 'starch', [355, 12.5, 72, 1.5, 3], ['gluten'], [], 100),
  f('pasta_whole_raw', 'Pâtes complètes (crues)', 'starch', [340, 13, 62, 2.5, 8], ['gluten'], [], 100),
  f('pasta_cooked', 'Pâtes cuites', 'starch', [150, 5.5, 29, 0.9, 2], ['gluten'], [], 250),
  f('potato', 'Pommes de terre (crues)', 'starch', [80, 2, 17, 0.1, 2], ['volume'], [P_('1 pomme de terre moyenne', 150)], 300),
  f('sweet_potato', 'Patate douce (crue)', 'starch', [85, 1.6, 20, 0.1, 3], ['volume'], [], 250),
  f('frozen_fries', 'Frites surgelées (précuites)', 'starch', [150, 2.5, 25, 4.5, 2.5], ['plaisir'], [], 200),
  f('bread', 'Pain (baguette)', 'starch', [275, 9, 56, 1.5, 3], ['gluten'], [P_('1 tranche', 30), P_('1/2 baguette', 125)], 60),
  f('wholemeal_bread', 'Pain complet', 'starch', [250, 9, 45, 2, 7], ['gluten'], [P_('1 tranche', 35)], 70),
  f('tortilla_wrap', 'Tortilla de blé (wrap)', 'starch', [300, 8, 50, 7.5, 3], ['gluten'], [P_('1 wrap', 60)], 60),
  f('burger_bun', 'Pain burger', 'starch', [280, 9, 48, 5, 2.5], ['gluten'], [P_('1 pain', 55)], 55),
  f('oats', 'Flocons d’avoine', 'starch', [370, 13, 60, 7, 10], ['gluten'], [P_('1 c. à soupe', 10)], 50),
  f('couscous_raw', 'Semoule de couscous (crue)', 'starch', [360, 12.5, 73, 1.5, 4], ['gluten'], [], 80),
  f('quinoa_cooked', 'Quinoa cuit', 'starch', [120, 4.4, 21, 1.9, 2.8], [], [], 200),
  f('lentils_cooked', 'Lentilles cuites', 'starch', [115, 9, 17, 0.4, 8], ['volume', 'proteine'], [], 200),
  f('chickpeas_can', 'Pois chiches en conserve (égouttés)', 'starch', [140, 8, 19, 2.5, 6], [], [], 150),
  f('red_beans_can', 'Haricots rouges en conserve (égouttés)', 'starch', [95, 7, 13, 0.5, 6], ['volume'], [], 150),
  f('gnocchi', 'Gnocchi', 'starch', [150, 4, 32, 0.5, 1.5], ['gluten'], [], 250),
  f('rice_cakes', 'Galettes de riz', 'starch', [380, 8, 80, 3, 2], [], [P_('1 galette', 8)], 16),
  f('pizza_dough', 'Pâte à pizza (prête à dérouler)', 'starch', [260, 8, 45, 5, 2], ['gluten'], [P_('1 pâte', 260)], 130),

  // ——— Légumes ———
  f('broccoli', 'Brocoli (cuit)', 'vegetable', [35, 2.4, 4, 0.4, 3], ['cooked', 'volume'], [], 200),
  f('green_beans', 'Haricots verts (cuits)', 'vegetable', [30, 1.8, 4.5, 0.2, 3], ['cooked', 'volume'], [], 200),
  f('carrot_cooked', 'Carottes cuites', 'vegetable', [35, 0.7, 7, 0.2, 2.5], ['cooked', 'volume'], [], 200),
  f('zucchini', 'Courgette (cuite)', 'vegetable', [20, 1, 3, 0.3, 1.2], ['cooked', 'volume'], [], 200),
  f('spinach', 'Épinards (cuits)', 'vegetable', [25, 3, 1.5, 0.3, 2.5], ['cooked', 'volume'], [], 200),
  f('frozen_veg_mix', 'Poêlée de légumes (surgelée)', 'vegetable', [50, 2, 7, 1, 3], ['cooked', 'volume', 'rapide'], [], 200),
  f('peas', 'Petits pois', 'vegetable', [80, 5.5, 11, 0.5, 5], ['cooked'], [], 150),
  f('mushrooms', 'Champignons de Paris', 'vegetable', [25, 2.5, 1, 0.5, 2], ['cooked', 'volume'], [], 150),
  f('bell_pepper', 'Poivron (cuit)', 'vegetable', [25, 1, 4, 0.3, 2], ['cooked'], [P_('1 poivron', 150)], 150),
  f('cauliflower', 'Chou-fleur (cuit)', 'vegetable', [25, 2, 3, 0.3, 2], ['cooked', 'volume'], [], 200),
  f('eggplant', 'Aubergine (cuite)', 'vegetable', [30, 1, 4, 0.3, 3], ['cooked'], [], 200),
  f('onion', 'Oignon', 'vegetable', [40, 1, 8, 0.2, 1.5], ['cooked'], [P_('1 oignon', 80)], 50),
  f('corn_can', 'Maïs en boîte', 'vegetable', [90, 3, 17, 1.5, 3], [], [], 80),
  f('lettuce', 'Salade verte', 'vegetable', [15, 1.2, 1.5, 0.2, 1.5], ['crudite', 'raw', 'volume'], [], 50),
  f('tomato', 'Tomate (crue)', 'vegetable', [20, 0.9, 3, 0.2, 1.2], ['crudite', 'raw', 'volume'], [P_('1 tomate', 120)], 120),
  f('cucumber', 'Concombre', 'vegetable', [15, 0.6, 2, 0.1, 0.7], ['crudite', 'raw', 'volume'], [], 100),
  f('grated_carrot', 'Carottes râpées', 'vegetable', [35, 0.8, 7, 0.2, 2.5], ['crudite', 'raw'], [], 100),

  // ——— Fruits ———
  f('apple', 'Pomme', 'fruit', [52, 0.3, 12, 0.2, 2], ['volume'], [P_('1 pomme', 150)], 150),
  f('banana', 'Banane', 'fruit', [90, 1.1, 20, 0.3, 2], [], [P_('1 banane', 120)], 120),
  f('orange', 'Orange', 'fruit', [45, 0.9, 9, 0.2, 2], ['volume'], [P_('1 orange', 150)], 150),
  f('clementine', 'Clémentines', 'fruit', [45, 0.8, 9, 0.2, 1.5], [], [P_('1 clémentine', 60)], 120),
  f('pear', 'Poire', 'fruit', [55, 0.4, 12, 0.2, 3], ['volume'], [P_('1 poire', 160)], 160),
  f('strawberries', 'Fraises', 'fruit', [32, 0.7, 6, 0.3, 2], ['volume'], [], 150),
  f('grapes', 'Raisin', 'fruit', [70, 0.6, 16, 0.2, 1], [], [], 120),
  f('kiwi', 'Kiwi', 'fruit', [55, 1, 10, 0.5, 3], [], [P_('1 kiwi', 75)], 75),
  f('frozen_berries', 'Fruits rouges (surgelés)', 'fruit', [40, 1, 7, 0.3, 3], ['volume'], [], 100),
  f('compote', 'Compote sans sucres ajoutés', 'fruit', [55, 0.3, 12, 0.2, 1.5], [], [P_('1 gourde/pot', 100)], 100),

  // ——— Produits laitiers ———
  f('skyr', 'Skyr nature', 'dairy', [60, 11, 4, 0.2], [A, 'lactose', 'proteine', 'volume'], [P_('1 pot', 150)], 200),
  f('fromage_blanc_0', 'Fromage blanc 0 %', 'dairy', [45, 8, 4, 0.1], [A, 'lactose', 'proteine', 'volume'], [P_('1 pot', 100)], 200),
  f('greek_yogurt_0', 'Yaourt grec 0 %', 'dairy', [55, 10, 3.5, 0.2], [A, 'lactose', 'proteine'], [P_('1 pot', 150)], 150),
  f('yogurt', 'Yaourt nature', 'dairy', [60, 4, 5, 3], [A, 'lactose'], [P_('1 pot', 125)], 125),
  f('greek_yogurt_full', 'Yaourt grec entier', 'dairy', [130, 5.5, 4.5, 10], [A, 'lactose'], [P_('1 pot', 150)], 150),
  f('fromage_blanc_3', 'Fromage blanc 3 %', 'dairy', [70, 8, 4, 3], [A, 'lactose', 'proteine'], [P_('1 pot', 100)], 200),
  f('fromage_blanc_8', 'Fromage blanc 8 %', 'dairy', [100, 7, 4, 8], [A, 'lactose'], [P_('1 pot', 100)], 200),
  f('cottage', 'Cottage cheese', 'dairy', [100, 12, 3, 4], [A, 'lactose', 'proteine'], [], 150),
  f('milk_skim', 'Lait écrémé', 'dairy', [35, 3.4, 5, 0.1], [A, 'lactose'], [P_('1 verre', 200), P_('1 bol', 250)], 250),
  f('milk_semi', 'Lait demi-écrémé', 'dairy', [47, 3.3, 4.8, 1.6], [A, 'lactose'], [P_('1 verre', 200), P_('1 bol', 250)], 250),
  f('milk_whole', 'Lait entier', 'dairy', [64, 3.2, 4.7, 3.6], [A, 'lactose'], [P_('1 verre', 200), P_('1 bol', 250)], 250),
  f('parmesan', 'Parmesan', 'dairy', [400, 33, 0, 30], [A, 'lactose', 'plaisir'], [P_('1 c. à soupe', 10)], 15),
  f('gruyere', 'Gruyère / emmental râpé', 'dairy', [400, 28, 0.5, 32], [A, 'lactose', 'plaisir'], [P_('1 poignée', 30)], 30),
  f('mozzarella', 'Mozzarella', 'dairy', [250, 18, 1, 19], [A, 'lactose'], [P_('1 boule', 125)], 60),
  f('feta', 'Feta', 'dairy', [260, 16, 1, 21], [A, 'lactose'], [], 40),
  f('cheddar_slice', 'Cheddar (tranche)', 'dairy', [350, 25, 1, 28], [A, 'lactose', 'plaisir'], [P_('1 tranche', 20)], 20),
  f('goat_cheese', 'Chèvre (bûche)', 'dairy', [290, 20, 1, 23], [A, 'lactose'], [], 40),
  f('cream_light', 'Crème légère 15 %', 'dairy', [160, 3, 4, 15], [A, 'lactose'], [P_('1 c. à soupe', 15)], 50),
  f('cream_full', 'Crème entière 30 %', 'dairy', [300, 2, 3, 30], [A, 'lactose'], [P_('1 c. à soupe', 15)], 50),
  f('whey', 'Whey protéine (poudre)', 'dairy', [380, 78, 6, 5], [A, 'lactose', 'proteine'], [P_('1 dose', 30)], 30),
  f('protein_pudding', 'Dessert lacté protéiné', 'dairy', [90, 10, 8, 2], [A, 'lactose', 'proteine'], [P_('1 pot', 200)], 200),

  // ——— Sauces & condiments ———
  f('ketchup', 'Ketchup', 'sauce', [100, 1.2, 24, 0.2], ['plaisir'], [P_('1 c. à soupe', 15)], 20),
  f('mustard', 'Moutarde', 'sauce', [150, 6, 7, 10], [], [P_('1 c. à café', 5)], 10),
  f('soy_sauce', 'Sauce soja', 'sauce', [55, 8, 5, 0], ['gluten'], [P_('1 c. à soupe', 15)], 15),
  f('tomato_sauce', 'Sauce tomate (basilic)', 'sauce', [60, 1.5, 9, 2], [], [], 150),
  f('tomato_passata', 'Coulis / pulpe de tomate', 'sauce', [35, 1.5, 5, 0.5, 1.5], ['volume'], [], 200),
  f('mayo', 'Mayonnaise', 'sauce', [700, 1, 2, 77], ['plaisir'], [P_('1 c. à soupe', 15)], 15),
  f('mayo_light', 'Mayonnaise allégée', 'sauce', [350, 1, 8, 35], [], [P_('1 c. à soupe', 15)], 15),
  f('bbq_sauce', 'Sauce barbecue', 'sauce', [150, 1, 35, 0.5], ['plaisir'], [P_('1 c. à soupe', 15)], 20),
  f('pesto', 'Pesto', 'sauce', [450, 5, 6, 45], [A, 'lactose'], [P_('1 c. à soupe', 15)], 20),
  f('coconut_milk_light', 'Lait de coco allégé', 'sauce', [70, 0.7, 2, 6.5], [], [], 100),
  f('yogurt_sauce', 'Sauce blanche au yaourt (maison)', 'sauce', [70, 4, 4, 4], [A, 'lactose'], [P_('1 c. à soupe', 15)], 40),
  f('curry_powder', 'Curry / épices en poudre', 'sauce', [325, 13, 40, 13], [], [P_('1 c. à café', 3)], 5),
  f('hummus', 'Houmous', 'sauce', [250, 7, 12, 18, 6], [], [P_('1 c. à soupe', 20)], 50),

  // ——— Huiles & matières grasses ———
  f('olive_oil', 'Huile d’olive', 'fat', [900, 0, 0, 100], [], [P_('1 c. à café', 5), P_('1 c. à soupe', 10)], 10),
  f('butter', 'Beurre', 'fat', [750, 0.7, 0.5, 82], [A, 'lactose'], [P_('1 noisette', 10)], 10),

  // ——— Snacks ———
  f('crisps', 'Chips', 'snack', [530, 6, 50, 33], ['plaisir'], [P_('1 petite poignée', 30)], 30),
  f('almonds', 'Amandes', 'snack', [600, 21, 8, 50, 12], [], [P_('1 poignée', 20)], 20),
  f('peanut_butter', 'Beurre de cacahuète', 'snack', [600, 25, 15, 50, 6], [], [P_('1 c. à soupe', 15)], 15),
  f('protein_bar', 'Barre protéinée', 'snack', [380, 30, 35, 12], ['proteine'], [P_('1 barre', 50)], 50),
  f('popcorn', 'Popcorn nature (micro-ondes)', 'snack', [380, 12, 60, 5, 12], ['volume'], [P_('1 bol', 30)], 30),
  f('cereal_bar', 'Barre de céréales', 'snack', [400, 6, 70, 10], [], [P_('1 barre', 25)], 25),
  f('tofu', 'Tofu ferme', 'snack', [120, 13, 2, 7], ['proteine', 'vegan'], [], 150),
  f('frozen_pizza', 'Pizza surgelée (margherita)', 'snack', [240, 10, 30, 9], ['gluten', 'lactose', 'plaisir'], [P_('1 pizza', 350), P_('1/2 pizza', 175)], 350),
  f('frozen_lasagna', 'Lasagnes surgelées', 'snack', [140, 7, 14, 6], ['gluten', 'lactose', 'plaisir'], [P_('1 barquette', 300)], 300),

  // ——— Desserts & sucré ———
  f('dark_chocolate', 'Chocolat noir 70 %', 'dessert', [570, 8, 30, 45, 10], ['plaisir'], [P_('1 carré', 10)], 20),
  f('milk_chocolate', 'Chocolat au lait', 'dessert', [540, 7, 57, 30], ['lactose', 'plaisir'], [P_('1 carré', 10)], 20),
  f('ice_cream', 'Glace vanille', 'dessert', [200, 3.5, 24, 10], ['lactose', 'plaisir'], [P_('1 boule', 60)], 120),
  f('cookie', 'Cookie', 'dessert', [480, 5, 65, 22], ['gluten', 'plaisir'], [P_('1 cookie', 30)], 30),
  f('croissant', 'Croissant', 'dessert', [400, 8, 45, 21], ['gluten', 'plaisir'], [P_('1 croissant', 50)], 50),
  f('honey', 'Miel', 'dessert', [320, 0.3, 80, 0], [], [P_('1 c. à café', 7)], 10),
  f('jam', 'Confiture', 'dessert', [250, 0.4, 60, 0.1], [], [P_('1 c. à café', 10)], 15),
  f('sugar', 'Sucre', 'dessert', [400, 0, 100, 0], [], [P_('1 morceau', 5)], 5),
  f('choc_spread', 'Pâte à tartiner', 'dessert', [540, 6, 57, 31], ['plaisir'], [P_('1 c. à soupe', 15)], 15),

  // ——— Boissons (pour 100 ml) ———
  f('soda', 'Soda sucré', 'drink', [42, 0, 10.5, 0], ['plaisir'], [P_('1 canette', 330)], 330),
  f('soda_zero', 'Soda zéro / light', 'drink', [0.3, 0, 0, 0], [], [P_('1 canette', 330)], 330),
  f('orange_juice', 'Jus d’orange', 'drink', [45, 0.7, 10, 0.2], [], [P_('1 verre', 200)], 200),
  f('beer', 'Bière 5 %', 'drink', [43, 0.5, 3, 0], [], [P_('1 demi', 250), P_('1 pinte', 500)], 250),
  f('coffee', 'Café noir', 'drink', [2, 0.2, 0, 0], [], [P_('1 tasse', 100)], 100),
];

/**
 * Groupes de variantes : même aliment, versions plus ou moins grasses/complètes.
 * rank 0 = la plus légère. L'app propose la plus légère par défaut mais
 * l'utilisateur choisit précisément ce qu'il prend (et peut fixer son habituel).
 */
const VARIANTS: Record<string, { group: string; label: string; rank: number }> = {
  ground_beef_5: { group: 'ground_beef', label: '5 % MG', rank: 0 },
  ground_beef_10: { group: 'ground_beef', label: '10 % MG', rank: 1 },
  ground_beef_15: { group: 'ground_beef', label: '15 % MG', rank: 2 },
  ground_beef_20: { group: 'ground_beef', label: '20 % MG', rank: 3 },
  chicken_breast: { group: 'chicken', label: 'blanc', rank: 0 },
  chicken_thigh: { group: 'chicken', label: 'haut de cuisse', rank: 1 },
  ham: { group: 'ham', label: 'dégraissé', rank: 0 },
  ham_std: { group: 'ham', label: 'standard', rank: 1 },
  rice_brown_cooked: { group: 'rice_cooked', label: 'complet', rank: 0 },
  rice_cooked: { group: 'rice_cooked', label: 'blanc', rank: 1 },
  pasta_whole_raw: { group: 'pasta', label: 'complètes', rank: 0 },
  pasta_raw: { group: 'pasta', label: 'blanches', rank: 1 },
  wholemeal_bread: { group: 'bread', label: 'complet', rank: 0 },
  bread: { group: 'bread', label: 'blanc', rank: 1 },
  greek_yogurt_0: { group: 'yogurt', label: 'grec 0 %', rank: 0 },
  yogurt: { group: 'yogurt', label: 'nature', rank: 1 },
  greek_yogurt_full: { group: 'yogurt', label: 'grec entier', rank: 2 },
  fromage_blanc_0: { group: 'fromage_blanc', label: '0 %', rank: 0 },
  fromage_blanc_3: { group: 'fromage_blanc', label: '3 %', rank: 1 },
  fromage_blanc_8: { group: 'fromage_blanc', label: '8 %', rank: 2 },
  milk_skim: { group: 'milk', label: 'écrémé', rank: 0 },
  milk_semi: { group: 'milk', label: 'demi-écrémé', rank: 1 },
  milk_whole: { group: 'milk', label: 'entier', rank: 2 },
  cream_light: { group: 'cream', label: '15 %', rank: 0 },
  cream_full: { group: 'cream', label: '30 %', rank: 1 },
  mayo_light: { group: 'mayo', label: 'allégée', rank: 0 },
  mayo: { group: 'mayo', label: 'classique', rank: 1 },
  soda_zero: { group: 'soda', label: 'zéro', rank: 0 },
  soda: { group: 'soda', label: 'sucré', rank: 1 },
  potato: { group: 'fries', label: 'maison (pommes de terre)', rank: 0 },
  frozen_fries: { group: 'fries', label: 'surgelées', rank: 1 },
  dark_chocolate: { group: 'chocolate', label: 'noir 70 %', rank: 0 },
  milk_chocolate: { group: 'chocolate', label: 'au lait', rank: 1 },
};
for (const food of SEED_FOODS) {
  const v = VARIANTS[food.id];
  if (v) {
    food.variantGroup = v.group;
    food.variantLabel = v.label;
    food.variantRank = v.rank;
  }
}

export const SEED_FOOD_IDS = new Set(SEED_FOODS.map((x) => x.id));
