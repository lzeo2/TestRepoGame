/* Original editor-written prompts and answer organization. No reference-game text.
 * Tiers 0..5 are subjective editorial rarity, not population-survey results.
 * This finite answer key is not exhaustive: an unlisted answer may be valid.
 * No live analytics, external data, or runtime requests are used.
 */
(function () {
  'use strict';

  globalThis.DiveQuestions = {
    version: '2026.10.1',
    packs: [
      { id: 'nature', title: 'Living world', description: 'Penguins, plants, and animal families. Curated answers, not exhaustive lists; rarity is editor-assigned.' },
      { id: 'world', title: 'Across the map', description: 'Rivers, islands, mountains, and cities. Curated answers, not exhaustive lists; rarity is editor-assigned.' },
      { id: 'science', title: 'Science shelf', description: 'Elements, units, space, and the human skeleton. Curated answers, not exhaustive lists; rarity is editor-assigned.' },
      { id: 'words', title: 'Word workshop', description: 'Spelling patterns and familiar names. Curated answers, not exhaustive lists; rarity is editor-assigned.' }
    ],
    prompts: [
      {
        id: 'nature-penguins', pack: 'nature',
        text: 'Name a living penguin species. Use its common English name, not just "penguin".',
        groups: [
          { tier: 0, answers: [{ text: 'Emperor penguin', aliases: ['emperor'] }, { text: 'King penguin', aliases: ['king'] }] },
          { tier: 1, answers: [{ text: 'Adelie penguin', aliases: ['Adélie penguin', 'adelie', 'adélie'] }, { text: 'Gentoo penguin', aliases: ['gentoo'] }] },
          { tier: 2, answers: [{ text: 'Chinstrap penguin', aliases: ['chinstrap'] }, { text: 'Macaroni penguin', aliases: ['macaroni'] }] },
          { tier: 3, answers: [{ text: 'African penguin', aliases: ['african', 'jackass penguin'] }, { text: 'Erect-crested penguin', aliases: ['erect crested penguin', 'Eudyptes sclateri'] }] },
          { tier: 4, answers: [{ text: 'Humboldt penguin', aliases: ['humboldt'] }, { text: 'Magellanic penguin', aliases: ['magellanic'] }] },
          { tier: 5, answers: [{ text: 'Galapagos penguin', aliases: ['Galápagos penguin', 'galapagos', 'galápagos'] }, { text: 'Yellow-eyed penguin', aliases: ['yellow eyed penguin', 'hoiho'] }] }
        ]
      },
      {
        id: 'nature-cats', pack: 'nature',
        text: 'Name a living wild cat species in the family Felidae. Use a species name, not a domestic breed.',
        groups: [
          { tier: 0, answers: [{ text: 'Lion', aliases: ['Panthera leo'] }, { text: 'Tiger', aliases: ['Panthera tigris'] }] },
          { tier: 1, answers: [{ text: 'Leopard', aliases: ['Panthera pardus'] }, { text: 'Cheetah', aliases: ['Acinonyx jubatus'] }] },
          { tier: 2, answers: [{ text: 'Jaguar', aliases: ['Panthera onca'] }, { text: 'Cougar', aliases: ['puma', 'mountain lion', 'Puma concolor'] }] },
          { tier: 3, answers: [{ text: 'Snow leopard', aliases: ['Panthera uncia'] }, { text: 'Bobcat', aliases: ['Lynx rufus'] }] },
          { tier: 4, answers: [{ text: 'Caracal', aliases: ['Caracal caracal'] }, { text: 'Serval', aliases: ['Leptailurus serval'] }] },
          { tier: 5, answers: [{ text: 'Ocelot', aliases: ['Leopardus pardalis'] }, { text: 'Eurasian lynx', aliases: ['Lynx lynx'] }] }
        ]
      },
      {
        id: 'nature-corvids', pack: 'nature',
        text: 'Name a living bird species in the crow family, Corvidae. Give a species name rather than just "crow" or "jay".',
        groups: [
          { tier: 0, answers: [{ text: 'Common raven', aliases: ['Corvus corax'] }, { text: 'American crow', aliases: ['Corvus brachyrhynchos'] }] },
          { tier: 1, answers: [{ text: 'Blue jay', aliases: ['Cyanocitta cristata'] }, { text: 'Eurasian magpie', aliases: ['Pica pica'] }] },
          { tier: 2, answers: [{ text: 'Rook', aliases: ['Corvus frugilegus'] }, { text: 'Western jackdaw', aliases: ['Eurasian jackdaw', 'Coloeus monedula', 'Corvus monedula'] }] },
          { tier: 3, answers: [{ text: 'Eurasian jay', aliases: ['Garrulus glandarius'] }, { text: 'Hooded crow', aliases: ['Corvus cornix'] }] },
          { tier: 4, answers: [{ text: 'Carrion crow', aliases: ['Corvus corone'] }, { text: 'Red-billed chough', aliases: ['red billed chough', 'Pyrrhocorax pyrrhocorax'] }] },
          { tier: 5, answers: [{ text: 'Alpine chough', aliases: ['yellow-billed chough', 'yellow billed chough', 'Pyrrhocorax graculus'] }, { text: 'Azure-winged magpie', aliases: ['azure winged magpie', 'Cyanopica cyanus'] }] }
        ]
      },
      {
        id: 'nature-tree-genera', pack: 'nature',
        text: 'Name a genus of trees. A scientific genus name or its usual English group name is accepted.',
        groups: [
          { tier: 0, answers: [{ text: 'Quercus', aliases: ['oak', 'oaks'] }, { text: 'Pinus', aliases: ['pine', 'pines'] }] },
          { tier: 1, answers: [{ text: 'Acer', aliases: ['maple', 'maples'] }, { text: 'Betula', aliases: ['birch', 'birches'] }] },
          { tier: 2, answers: [{ text: 'Salix', aliases: ['willow', 'willows'] }, { text: 'Picea', aliases: ['spruce', 'spruces'] }] },
          { tier: 3, answers: [{ text: 'Fagus', aliases: ['beech', 'beeches'] }, { text: 'Ulmus', aliases: ['elm', 'elms'] }] },
          { tier: 4, answers: [{ text: 'Fraxinus', aliases: ['ash', 'ashes', 'ash tree'] }, { text: 'Populus', aliases: ['poplar', 'poplars'] }] },
          { tier: 5, answers: [{ text: 'Ginkgo', aliases: ['gingko', 'maidenhair tree'] }, { text: 'Cedrus', aliases: ['true cedar', 'true cedars'] }] }
        ]
      },
      {
        id: 'nature-insect-orders', pack: 'nature',
        text: 'Give the scientific name of an order of living insects, such as the order containing beetles.',
        groups: [
          { tier: 0, answers: [{ text: 'Coleoptera', aliases: [] }, { text: 'Lepidoptera', aliases: [] }] },
          { tier: 1, answers: [{ text: 'Diptera', aliases: [] }, { text: 'Hymenoptera', aliases: [] }] },
          { tier: 2, answers: [{ text: 'Orthoptera', aliases: [] }, { text: 'Odonata', aliases: [] }] },
          { tier: 3, answers: [{ text: 'Hemiptera', aliases: [] }, { text: 'Mantodea', aliases: [] }] },
          { tier: 4, answers: [{ text: 'Phasmatodea', aliases: ['Phasmida'] }, { text: 'Dermaptera', aliases: [] }] },
          { tier: 5, answers: [{ text: 'Neuroptera', aliases: [] }, { text: 'Siphonaptera', aliases: [] }] }
        ]
      },
      {
        id: 'nature-botanical-berries', pack: 'nature',
        text: 'Name an edible fruit botanically classed as a berry. Pepos and hesperidia, the berry types of gourds and citrus, count.',
        groups: [
          { tier: 0, answers: [{ text: 'Grape', aliases: ['grapes'] }, { text: 'Tomato', aliases: ['tomatoes'] }] },
          { tier: 1, answers: [{ text: 'Banana', aliases: ['bananas'] }, { text: 'Blueberry', aliases: ['blueberries'] }] },
          { tier: 2, answers: [{ text: 'Orange', aliases: ['oranges'] }, { text: 'Lemon', aliases: ['lemons'] }] },
          { tier: 3, answers: [{ text: 'Cucumber', aliases: ['cucumbers'] }, { text: 'Watermelon', aliases: ['watermelons'] }] },
          { tier: 4, answers: [{ text: 'Eggplant', aliases: ['eggplants', 'aubergine', 'aubergines', 'brinjal'] }, { text: 'Avocado', aliases: ['avocados', 'avocado pear'] }] },
          { tier: 5, answers: [{ text: 'Kiwifruit', aliases: ['kiwi fruit', 'kiwi', 'Chinese gooseberry'] }, { text: 'Pumpkin', aliases: ['pumpkins'] }] }
        ]
      },
      {
        id: 'nature-mint-family', pack: 'nature',
        text: 'Name a culinary or aromatic plant in the mint family, Lamiaceae. A familiar herb name is enough.',
        groups: [
          { tier: 0, answers: [{ text: 'Sweet basil', aliases: ['basil', 'Ocimum basilicum'] }, { text: 'Peppermint', aliases: ['Mentha piperita', 'Mentha x piperita'] }] },
          { tier: 1, answers: [{ text: 'Rosemary', aliases: ['Salvia rosmarinus', 'Rosmarinus officinalis'] }, { text: 'Common thyme', aliases: ['thyme', 'Thymus vulgaris'] }] },
          { tier: 2, answers: [{ text: 'Oregano', aliases: ['Origanum vulgare'] }, { text: 'Common sage', aliases: ['sage', 'Salvia officinalis'] }] },
          { tier: 3, answers: [{ text: 'English lavender', aliases: ['lavender', 'Lavandula angustifolia'] }, { text: 'Sweet marjoram', aliases: ['marjoram', 'Origanum majorana'] }] },
          { tier: 4, answers: [{ text: 'Lemon balm', aliases: ['Melissa officinalis'] }, { text: 'Summer savory', aliases: ['summer savoury', 'Satureja hortensis'] }] },
          { tier: 5, answers: [{ text: 'Catnip', aliases: ['Nepeta cataria'] }, { text: 'Common hyssop', aliases: ['hyssop', 'Hyssopus officinalis'] }] }
        ]
      },
      {
        id: 'world-long-rivers', pack: 'world',
        text: 'Name a river on Earth with a main stem more than 1,000 kilometres long. Name the river, not its drainage basin.',
        groups: [
          { tier: 0, answers: [{ text: 'Nile', aliases: ['River Nile', 'Nile River'] }, { text: 'Amazon', aliases: ['Amazon River'] }] },
          { tier: 1, answers: [{ text: 'Mississippi', aliases: ['Mississippi River'] }, { text: 'Yangtze', aliases: ['Yangtze River', 'Chang Jiang', 'Changjiang'] }] },
          { tier: 2, answers: [{ text: 'Danube', aliases: ['Danube River', 'Donau'] }, { text: 'Rhine', aliases: ['Rhine River', 'Rhein'] }] },
          { tier: 3, answers: [{ text: 'Mekong', aliases: ['Mekong River'] }, { text: 'Volga', aliases: ['Volga River'] }] },
          { tier: 4, answers: [{ text: 'Zambezi', aliases: ['Zambezi River', 'Zambesi'] }, { text: 'Orinoco', aliases: ['Orinoco River'] }] },
          { tier: 5, answers: [{ text: 'Limpopo', aliases: ['Limpopo River'] }, { text: 'Murray', aliases: ['Murray River', 'River Murray'] }] }
        ]
      },
      {
        id: 'world-summer-hosts', pack: 'world',
        text: 'Name a city that hosted the Summer Olympic Games at least once before 2025. Cancelled editions do not count.',
        groups: [
          { tier: 0, answers: [{ text: 'London', aliases: [] }, { text: 'Paris', aliases: [] }] },
          { tier: 1, answers: [{ text: 'Tokyo', aliases: ['Tōkyō'] }, { text: 'Athens', aliases: ['Athina', 'Athína'] }] },
          { tier: 2, answers: [{ text: 'Sydney', aliases: [] }, { text: 'Beijing', aliases: ['Peking'] }] },
          { tier: 3, answers: [{ text: 'Los Angeles', aliases: ['LA', 'L.A.'] }, { text: 'Rome', aliases: ['Roma'] }] },
          { tier: 4, answers: [{ text: 'Barcelona', aliases: [] }, { text: 'Melbourne', aliases: [] }] },
          { tier: 5, answers: [{ text: 'Helsinki', aliases: [] }, { text: 'Stockholm', aliases: [] }] }
        ]
      },
      {
        id: 'world-large-islands', pack: 'world',
        text: 'Name an island with an area over 100,000 square kilometres. Exclude continental landmasses such as Australia.',
        groups: [
          { tier: 0, answers: [{ text: 'Greenland', aliases: ['Kalaallit Nunaat'] }, { text: 'Madagascar', aliases: [] }] },
          { tier: 1, answers: [{ text: 'Borneo', aliases: [] }, { text: 'New Guinea', aliases: [] }] },
          { tier: 2, answers: [{ text: 'Great Britain', aliases: ['Britain'] }, { text: 'Honshu', aliases: ['Honshū'] }] },
          { tier: 3, answers: [{ text: 'Sumatra', aliases: ['Sumatera'] }, { text: 'Baffin Island', aliases: ['Baffin'] }] },
          { tier: 4, answers: [{ text: 'Sulawesi', aliases: ['Celebes'] }, { text: 'South Island', aliases: ['New Zealand South Island', 'Te Waipounamu'] }] },
          { tier: 5, answers: [{ text: 'Ellesmere Island', aliases: ['Ellesmere'] }, { text: 'Victoria Island', aliases: ['Canadian Victoria Island'] }] }
        ]
      },
      {
        id: 'world-eight-thousanders', pack: 'world',
        text: 'Name a mountain summit higher than 8,000 metres above sea level. Use the main summit name where numbered.',
        groups: [
          { tier: 0, answers: [{ text: 'Everest', aliases: ['Mount Everest', 'Sagarmatha', 'Chomolungma', 'Qomolangma'] }, { text: 'K2', aliases: ['K 2', 'K-2', 'Mount Godwin-Austen', 'Godwin Austen'] }] },
          { tier: 1, answers: [{ text: 'Kangchenjunga', aliases: ['Kanchenjunga', 'Kanchendzonga'] }, { text: 'Lhotse', aliases: [] }] },
          { tier: 2, answers: [{ text: 'Makalu', aliases: [] }, { text: 'Cho Oyu', aliases: ['Cho-Oyu'] }] },
          { tier: 3, answers: [{ text: 'Dhaulagiri I', aliases: ['Dhaulagiri', 'Dhaulagiri 1'] }, { text: 'Manaslu', aliases: [] }] },
          { tier: 4, answers: [{ text: 'Nanga Parbat', aliases: ['Nangaparbat', 'Diamir'] }, { text: 'Annapurna I', aliases: ['Annapurna', 'Annapurna 1'] }] },
          { tier: 5, answers: [{ text: 'Gasherbrum I', aliases: ['Gasherbrum 1', 'Hidden Peak', 'K5'] }, { text: 'Broad Peak', aliases: ['Falchan Kangri', 'K3'] }] }
        ]
      },
      {
        id: 'world-danube-cities', pack: 'world',
        text: 'Name a European city through which the River Danube flows. A city on either bank counts.',
        groups: [
          { tier: 0, answers: [{ text: 'Vienna', aliases: ['Wien'] }, { text: 'Budapest', aliases: [] }] },
          { tier: 1, answers: [{ text: 'Belgrade', aliases: ['Beograd'] }, { text: 'Bratislava', aliases: [] }] },
          { tier: 2, answers: [{ text: 'Linz', aliases: [] }, { text: 'Ulm', aliases: [] }] },
          { tier: 3, answers: [{ text: 'Regensburg', aliases: ['Ratisbon'] }, { text: 'Passau', aliases: [] }] },
          { tier: 4, answers: [{ text: 'Ingolstadt', aliases: [] }, { text: 'Novi Sad', aliases: [] }] },
          { tier: 5, answers: [{ text: 'Ruse', aliases: ['Rousse', 'Russe'] }, { text: 'Vidin', aliases: [] }] }
        ]
      },
      {
        id: 'world-deserts', pack: 'world',
        text: 'Name a hot or cold desert on Earth, excluding polar ice-sheet deserts. Give the desert name, not a country.',
        groups: [
          { tier: 0, answers: [{ text: 'Sahara', aliases: ['Sahara Desert'] }, { text: 'Gobi', aliases: ['Gobi Desert'] }] },
          { tier: 1, answers: [{ text: 'Great Basin Desert', aliases: ['Great Basin'] }, { text: 'Atacama', aliases: ['Atacama Desert'] }] },
          { tier: 2, answers: [{ text: 'Arabian Desert', aliases: ['Arabian'] }, { text: 'Mojave', aliases: ['Mojave Desert', 'Mohave', 'Mohave Desert'] }] },
          { tier: 3, answers: [{ text: 'Namib', aliases: ['Namib Desert'] }, { text: 'Sonoran Desert', aliases: ['Sonoran'] }] },
          { tier: 4, answers: [{ text: 'Great Victoria Desert', aliases: ['Great Victoria'] }, { text: 'Great Sandy Desert', aliases: ['Great Sandy'] }] },
          { tier: 5, answers: [{ text: 'Simpson Desert', aliases: ['Simpson'] }, { text: 'Chihuahuan Desert', aliases: ['Chihuahuan'] }] }
        ]
      },
      {
        id: 'world-european-seas', pack: 'world',
        text: 'Name a sea whose waters touch the coast of Europe. Named smaller seas within larger seas count.',
        groups: [
          { tier: 0, answers: [{ text: 'Mediterranean Sea', aliases: ['Mediterranean'] }, { text: 'Baltic Sea', aliases: ['Baltic'] }] },
          { tier: 1, answers: [{ text: 'North Sea', aliases: [] }, { text: 'Black Sea', aliases: [] }] },
          { tier: 2, answers: [{ text: 'Adriatic Sea', aliases: ['Adriatic'] }, { text: 'Aegean Sea', aliases: ['Aegean'] }] },
          { tier: 3, answers: [{ text: 'Norwegian Sea', aliases: [] }, { text: 'Barents Sea', aliases: ['Barents'] }] },
          { tier: 4, answers: [{ text: 'Ionian Sea', aliases: ['Ionian'] }, { text: 'Tyrrhenian Sea', aliases: ['Tyrrhenian'] }] },
          { tier: 5, answers: [{ text: 'Ligurian Sea', aliases: ['Ligurian'] }, { text: 'White Sea', aliases: [] }] }
        ]
      },
      {
        id: 'science-one-letter-elements', pack: 'science',
        text: 'Name a chemical element whose official symbol is a single letter. Its name or symbol is accepted.',
        groups: [
          { tier: 0, answers: [{ text: 'Hydrogen', aliases: ['H'] }, { text: 'Oxygen', aliases: ['O'] }] },
          { tier: 1, answers: [{ text: 'Carbon', aliases: ['C'] }, { text: 'Nitrogen', aliases: ['N'] }] },
          { tier: 2, answers: [{ text: 'Sulfur', aliases: ['sulphur', 'S'] }, { text: 'Phosphorus', aliases: ['P'] }] },
          { tier: 3, answers: [{ text: 'Potassium', aliases: ['K'] }, { text: 'Fluorine', aliases: ['F'] }] },
          { tier: 4, answers: [{ text: 'Boron', aliases: ['B'] }, { text: 'Iodine', aliases: ['I'] }] },
          { tier: 5, answers: [{ text: 'Tungsten', aliases: ['wolfram', 'W'] }, { text: 'Vanadium', aliases: ['V'] }] }
        ]
      },
      {
        id: 'science-derived-units', pack: 'science',
        text: 'Name an SI derived unit with its own special name, rather than an SI base unit. Unit names or symbols are accepted.',
        groups: [
          { tier: 0, answers: [{ text: 'Newton', aliases: ['N', 'newtons'] }, { text: 'Joule', aliases: ['J', 'joules'] }] },
          { tier: 1, answers: [{ text: 'Watt', aliases: ['W', 'watts'] }, { text: 'Volt', aliases: ['V', 'volts'] }] },
          { tier: 2, answers: [{ text: 'Ohm', aliases: ['Ω', 'ohms'] }, { text: 'Hertz', aliases: ['Hz'] }] },
          { tier: 3, answers: [{ text: 'Pascal', aliases: ['Pa', 'pascals'] }, { text: 'Coulomb', aliases: ['C', 'coulombs'] }] },
          { tier: 4, answers: [{ text: 'Tesla', aliases: ['T', 'teslas'] }, { text: 'Farad', aliases: ['F', 'farads'] }] },
          { tier: 5, answers: [{ text: 'Henry', aliases: ['H', 'henries'] }, { text: 'Weber', aliases: ['Wb', 'webers'] }] }
        ]
      },
      {
        id: 'science-natural-satellites', pack: 'science',
        text: 'Name a natural satellite in our Solar System. Earth\'s Moon counts; artificial spacecraft do not.',
        groups: [
          { tier: 0, answers: [{ text: 'Moon', aliases: ['the Moon', 'Earth Moon', "Earth's Moon", 'Luna'] }, { text: 'Titan', aliases: [] }] },
          { tier: 1, answers: [{ text: 'Europa', aliases: [] }, { text: 'Ganymede', aliases: [] }] },
          { tier: 2, answers: [{ text: 'Io', aliases: [] }, { text: 'Callisto', aliases: [] }] },
          { tier: 3, answers: [{ text: 'Enceladus', aliases: [] }, { text: 'Triton', aliases: [] }] },
          { tier: 4, answers: [{ text: 'Phobos', aliases: [] }, { text: 'Deimos', aliases: [] }] },
          { tier: 5, answers: [{ text: 'Iapetus', aliases: ['Japetus'] }, { text: 'Mimas', aliases: [] }] }
        ]
      },
      {
        id: 'science-constellations', pack: 'science',
        text: 'Name one of the 88 constellations recognized by the International Astronomical Union. Asterisms alone do not count.',
        groups: [
          { tier: 0, answers: [{ text: 'Orion', aliases: ['Ori'] }, { text: 'Ursa Major', aliases: ['UMa', 'Great Bear'] }] },
          { tier: 1, answers: [{ text: 'Ursa Minor', aliases: ['UMi', 'Little Bear'] }, { text: 'Cassiopeia', aliases: ['Cas'] }] },
          { tier: 2, answers: [{ text: 'Leo', aliases: ['the Lion'] }, { text: 'Scorpius', aliases: ['Sco', 'Scorpio', 'the Scorpion'] }] },
          { tier: 3, answers: [{ text: 'Cygnus', aliases: ['Cyg', 'the Swan'] }, { text: 'Lyra', aliases: ['Lyr', 'the Lyre'] }] },
          { tier: 4, answers: [{ text: 'Draco', aliases: ['Dra', 'the Dragon'] }, { text: 'Pegasus', aliases: ['Peg', 'the Winged Horse'] }] },
          { tier: 5, answers: [{ text: 'Delphinus', aliases: ['Del', 'the Dolphin'] }, { text: 'Reticulum', aliases: ['Ret', 'the Reticle'] }] }
        ]
      },
      {
        id: 'science-human-bones', pack: 'science',
        text: 'Name an individual bone in a typical adult human skeleton, not a joint or a group such as "the skull".',
        groups: [
          { tier: 0, answers: [{ text: 'Femur', aliases: ['thighbone', 'thigh bone'] }, { text: 'Tibia', aliases: ['shinbone', 'shin bone'] }] },
          { tier: 1, answers: [{ text: 'Humerus', aliases: ['upper arm bone'] }, { text: 'Patella', aliases: ['kneecap', 'knee cap'] }] },
          { tier: 2, answers: [{ text: 'Radius', aliases: [] }, { text: 'Ulna', aliases: [] }] },
          { tier: 3, answers: [{ text: 'Clavicle', aliases: ['collarbone', 'collar bone'] }, { text: 'Scapula', aliases: ['shoulder blade', 'shoulderblade'] }] },
          { tier: 4, answers: [{ text: 'Sternum', aliases: ['breastbone', 'breast bone'] }, { text: 'Fibula', aliases: [] }] },
          { tier: 5, answers: [{ text: 'Mandible', aliases: ['lower jawbone', 'lower jaw bone'] }, { text: 'Calcaneus', aliases: ['heel bone', 'heelbone', 'calcaneum'] }] }
        ]
      },
      {
        id: 'science-large-si-prefixes', pack: 'science',
        text: 'Give the full name of an SI decimal prefix representing a factor greater than one. Do not give its symbol.',
        groups: [
          { tier: 0, answers: [{ text: 'Kilo', aliases: [] }, { text: 'Mega', aliases: [] }] },
          { tier: 1, answers: [{ text: 'Giga', aliases: [] }, { text: 'Tera', aliases: [] }] },
          { tier: 2, answers: [{ text: 'Hecto', aliases: [] }, { text: 'Deca', aliases: ['deka'] }] },
          { tier: 3, answers: [{ text: 'Peta', aliases: [] }, { text: 'Exa', aliases: [] }] },
          { tier: 4, answers: [{ text: 'Zetta', aliases: [] }, { text: 'Yotta', aliases: [] }] },
          { tier: 5, answers: [{ text: 'Ronna', aliases: [] }, { text: 'Quetta', aliases: [] }] }
        ]
      },
      {
        id: 'science-standard-amino-acids', pack: 'science',
        text: 'Name one of the 20 standard amino acids of the usual genetic code. Full names or three-letter abbreviations count.',
        groups: [
          { tier: 0, answers: [{ text: 'Glycine', aliases: ['Gly'] }, { text: 'Alanine', aliases: ['Ala'] }, { text: 'Leucine', aliases: ['Leu'] }, { text: 'Valine', aliases: ['Val'] }] },
          { tier: 1, answers: [{ text: 'Lysine', aliases: ['Lys'] }, { text: 'Serine', aliases: ['Ser'] }, { text: 'Proline', aliases: ['Pro'] }, { text: 'Glutamic acid', aliases: ['glutamate', 'Glu'] }] },
          { tier: 2, answers: [{ text: 'Aspartic acid', aliases: ['aspartate', 'Asp'] }, { text: 'Cysteine', aliases: ['Cys'] }, { text: 'Methionine', aliases: ['Met'] }] },
          { tier: 3, answers: [{ text: 'Phenylalanine', aliases: ['Phe'] }, { text: 'Tyrosine', aliases: ['Tyr'] }, { text: 'Tryptophan', aliases: ['Trp'] }] },
          { tier: 4, answers: [{ text: 'Histidine', aliases: ['His'] }, { text: 'Threonine', aliases: ['Thr'] }, { text: 'Isoleucine', aliases: ['Ile'] }] },
          { tier: 5, answers: [{ text: 'Arginine', aliases: ['Arg'] }, { text: 'Asparagine', aliases: ['Asn'] }, { text: 'Glutamine', aliases: ['Gln'] }] }
        ]
      },
      {
        id: 'words-three-letter-animals', pack: 'words',
        text: 'Give a common English name for an animal, spelled with exactly three letters. Use the singular form.',
        groups: [
          { tier: 0, answers: [{ text: 'Cat', aliases: [] }, { text: 'Dog', aliases: [] }] },
          { tier: 1, answers: [{ text: 'Cow', aliases: [] }, { text: 'Pig', aliases: [] }] },
          { tier: 2, answers: [{ text: 'Hen', aliases: [] }, { text: 'Fox', aliases: [] }] },
          { tier: 3, answers: [{ text: 'Owl', aliases: [] }, { text: 'Ant', aliases: [] }] },
          { tier: 4, answers: [{ text: 'Bee', aliases: [] }, { text: 'Bat', aliases: [] }] },
          { tier: 5, answers: [{ text: 'Yak', aliases: [] }, { text: 'Gnu', aliases: [] }] }
        ]
      },
      {
        id: 'words-palindromes', pack: 'words',
        text: 'Give a single English word of at least three letters that reads the same forward and backward. No proper names or acronyms.',
        groups: [
          { tier: 0, answers: [{ text: 'Level', aliases: [] }, { text: 'Rotator', aliases: [] }] },
          { tier: 1, answers: [{ text: 'Tenet', aliases: [] }, { text: 'Kayak', aliases: [] }] },
          { tier: 2, answers: [{ text: 'Civic', aliases: [] }, { text: 'Madam', aliases: [] }] },
          { tier: 3, answers: [{ text: 'Refer', aliases: [] }, { text: 'Rotor', aliases: [] }] },
          { tier: 4, answers: [{ text: 'Noon', aliases: [] }, { text: 'Deed', aliases: [] }] },
          { tier: 5, answers: [{ text: 'Peep', aliases: [] }, { text: 'Toot', aliases: [] }] }
        ]
      },
      {
        id: 'words-ending-ear', pack: 'words',
        text: 'Give a four-letter English word ending in the letters EAR. No proper names or abbreviations.',
        groups: [
          { tier: 0, answers: [{ text: 'Hear', aliases: [] }, { text: 'Year', aliases: [] }] },
          { tier: 1, answers: [{ text: 'Bear', aliases: [] }, { text: 'Near', aliases: [] }] },
          { tier: 2, answers: [{ text: 'Fear', aliases: [] }, { text: 'Dear', aliases: [] }] },
          { tier: 3, answers: [{ text: 'Wear', aliases: [] }, { text: 'Tear', aliases: [] }] },
          { tier: 4, answers: [{ text: 'Pear', aliases: [] }, { text: 'Gear', aliases: [] }] },
          { tier: 5, answers: [{ text: 'Rear', aliases: [] }, { text: 'Sear', aliases: [] }] }
        ]
      },
      {
        id: 'words-silent-k', pack: 'words',
        text: 'Give an English word beginning with a silent K immediately followed by N. No proper names.',
        groups: [
          { tier: 0, answers: [{ text: 'Knee', aliases: [] }, { text: 'Knife', aliases: [] }] },
          { tier: 1, answers: [{ text: 'Know', aliases: [] }, { text: 'Knight', aliases: [] }] },
          { tier: 2, answers: [{ text: 'Knock', aliases: [] }, { text: 'Knot', aliases: [] }] },
          { tier: 3, answers: [{ text: 'Knit', aliases: [] }, { text: 'Kneel', aliases: [] }] },
          { tier: 4, answers: [{ text: 'Knuckle', aliases: [] }, { text: 'Knack', aliases: [] }] },
          { tier: 5, answers: [{ text: 'Knoll', aliases: [] }, { text: 'Knapsack', aliases: [] }] }
        ]
      },
      {
        id: 'words-numbers-without-e', pack: 'words',
        text: 'Name a whole number from 0 through 100 whose English name contains no E. Digits are accepted; ignore spaces and hyphens.',
        groups: [
          { tier: 0, answers: [{ text: 'Two', aliases: ['2'] }, { text: 'Four', aliases: ['4'] }] },
          { tier: 1, answers: [{ text: 'Six', aliases: ['6'] }, { text: 'Thirty', aliases: ['30'] }] },
          { tier: 2, answers: [{ text: 'Forty', aliases: ['40'] }, { text: 'Fifty', aliases: ['50'] }] },
          { tier: 3, answers: [{ text: 'Sixty', aliases: ['60'] }, { text: 'Thirty-four', aliases: ['thirty four', '34'] }] },
          { tier: 4, answers: [{ text: 'Thirty-two', aliases: ['thirty two', '32'] }, { text: 'Forty-four', aliases: ['forty four', '44'] }] },
          { tier: 5, answers: [{ text: 'Fifty-six', aliases: ['fifty six', '56'] }, { text: 'Sixty-six', aliases: ['sixty six', '66'] }] }
        ]
      },
      {
        id: 'words-double-o', pack: 'words',
        text: 'Give a single English word containing two adjacent letter Os, as in the spelling pattern OO. No proper names.',
        groups: [
          { tier: 0, answers: [{ text: 'Book', aliases: [] }, { text: 'Moon', aliases: [] }] },
          { tier: 1, answers: [{ text: 'Room', aliases: [] }, { text: 'Food', aliases: [] }] },
          { tier: 2, answers: [{ text: 'Wood', aliases: [] }, { text: 'Foot', aliases: [] }] },
          { tier: 3, answers: [{ text: 'Cook', aliases: [] }, { text: 'Look', aliases: [] }] },
          { tier: 4, answers: [{ text: 'Pool', aliases: [] }, { text: 'Spoon', aliases: [] }] },
          { tier: 5, answers: [{ text: 'Tooth', aliases: [] }, { text: 'Goose', aliases: [] }] }
        ]
      },
      {
        id: 'words-short-instruments', pack: 'words',
        text: 'Give a single-word English name for a musical instrument, using at most five letters. Use the singular form.',
        groups: [
          { tier: 0, answers: [{ text: 'Piano', aliases: [] }, { text: 'Drum', aliases: [] }] },
          { tier: 1, answers: [{ text: 'Flute', aliases: [] }, { text: 'Harp', aliases: [] }] },
          { tier: 2, answers: [{ text: 'Cello', aliases: [] }, { text: 'Organ', aliases: [] }] },
          { tier: 3, answers: [{ text: 'Oboe', aliases: [] }, { text: 'Tuba', aliases: [] }] },
          { tier: 4, answers: [{ text: 'Viola', aliases: [] }, { text: 'Banjo', aliases: [] }] },
          { tier: 5, answers: [{ text: 'Gong', aliases: [] }, { text: 'Lute', aliases: [] }] }
        ]
      }
    ]
  };
}());
