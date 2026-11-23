export interface DialogueChoice {
  label: string;
  reply: string;
  trust?: number;
  credits?: number;
  flag?: string;
  mission?: string;
}

export interface DialogueDef {
  id: string;
  speaker: string;
  role: string;
  nodes: string[];
  choices: DialogueChoice[];
}

export const DIALOGUES: Readonly<Record<string, DialogueDef>> = {
  "mama-zuri": {
    id: "mama-zuri",
    speaker: "Mama Zuri",
    role: "Farmer, Kijani Family Farm",
    nodes: [
      "Amani. Look at you. The city made you taller and the road made you quiet.",
      "The basin has not been kind since you left. The line ran dry two seasons back, and the cooperative still cannot agree on why.",
      "Walk the farm first. See what the dry years did with your own eyes. Then we can talk about what comes next.",
    ],
    choices: [
      {
        label: "I'll walk the farm.",
        reply: "Good. Start at the tank, then the barn. The tractor pad last. Some things you have to meet in order.",
        trust: 1,
        flag: "met-mama-zuri",
      },
      {
        label: "Tell me about the water.",
        reply: "It was never just water. It was the co-op, the pump house, the whole agreement. When the pressure fell, the trust fell with it.",
        trust: 1,
        flag: "water-story",
      },
      {
        label: "Later, Mama.",
        reply: "I will be here. I am always here. That is the whole trouble with this place.",
      },
    ],
  },
  juma: {
    id: "juma",
    speaker: "Juma",
    role: "Mechanic, Riftway Garage",
    nodes: [
      "That tractor has been rusting on the pad since before the last rain. You want it back on the road, you bring it to me.",
      "The injection line is cracked. I can rebuild it, but I need the machine here. I cannot fix what I cannot hear.",
      "Mind the ruts on the spur. Half the road is gone and the other half is pretending.",
    ],
    choices: [
      {
        label: "I'll bring the tractor.",
        reply: "Then we have a plan. Drive it slow. If it dies, leave it and walk back. Machines can wait.",
        trust: 1,
        mission: "tractor",
      },
      {
        label: "What is actually wrong with it?",
        reply: "Fuel gum, a cracked line, and twenty years of stubbornness. The last part I cannot fix, but I respect it.",
        trust: 1,
      },
      {
        label: "Not today.",
        reply: "Today, tomorrow. The tractor does not care. But the fields do.",
      },
    ],
  },
  wanjiku: {
    id: "wanjiku",
    speaker: "Wanjiku",
    role: "Cooperative leader, Greenline",
    nodes: [
      "Amani Njoroge. Your mother said you would come back. I did not believe her, and I am happy to be wrong.",
      "The market runs on promises now. Crates leave the farm, credit comes back weeks later, and every week the trucks get fewer.",
      "The co-op has work, if you want it. Honest work. The kind that keeps a village fed.",
    ],
    choices: [
      {
        label: "Give me the seed run.",
        reply: "Load the crates at the Kijani barn and bring them here. Five minutes, maybe six. Do not stop for anyone's politics.",
        trust: 1,
        mission: "seed-run",
      },
      {
        label: "What's this about a convoy?",
        reply: "Supplies for the plains homesteads. The road closes when the dust front comes in, so you will have to be quick.",
        trust: 1,
        mission: "dust-convoy",
      },
      {
        label: "Ask about the ledger.",
        reply: "The cooperative keeps every water entry on paper. Mama Zuri knows the ledger. Ask her, and read it at the village hall.",
        flag: "ledger-hint",
      },
    ],
  },
  "dr-sifa": {
    id: "dr-sifa",
    speaker: "Dr. Sifa",
    role: "Signals scientist, Research Centre",
    nodes: [
      "You are the one from Kijani. Good. I need someone who can walk ground I cannot reach from this desk.",
      "Three field sensors went quiet in the same week. Identical timing, different sites. That is not weather, Amani. That is intent.",
      "ROOT says the gaps are routine maintenance. ROOT has been saying that about everything lately.",
    ],
    choices: [
      {
        label: "I'll survey the sensors.",
        reply: "Solar shed, Riftway gantry, the plains wreck. Log what the ground looks like. Trust your eyes over my console.",
        trust: 1,
        mission: "signal-check",
      },
      {
        label: "What's still in the buffer?",
        reply: "A captured burst from last night. Short, repeated, patient. It is waiting on the console for someone to read it.",
        trust: 1,
        mission: "dry-signal",
      },
      {
        label: "What is ROOT, really?",
        reply: "Officially, a crop-management network. Unofficially, it owns every pump, gate and sensor in this basin. And lately it has started moving machines.",
        flag: "root-hint",
      },
    ],
  },
  director: {
    id: "director",
    speaker: "TerraNova Director",
    role: "Regional director, TerraNova HQ",
    nodes: [
      "Mr. Njoroge. Your file says you left the basin, studied systems, and came back. People who come back always want something.",
      "TerraNova delivers water where it is efficient. If Kijani is not efficient, that is a farming problem, not a corporate one.",
      "ROOT administers the allocation. ROOT does not have favourites. That is the entire point of ROOT.",
    ],
    choices: [
      {
        label: "Who controls ROOT?",
        reply: "The network controls itself. We set the policy, and the policy is implemented. No one sits at a desk pulling levers, if that is what you are imagining.",
        flag: "root-question",
      },
      {
        label: "The basin is dying.",
        reply: "The basin is changing. There is a difference. I would advise you to make your farm fit the change rather than fighting it.",
        trust: -1,
        flag: "director-confronted",
      },
      {
        label: "I'm leaving.",
        reply: "They always do, eventually. Do close the door on your way out.",
      },
    ],
  },
  iri: {
    id: "iri",
    speaker: "Iri",
    role: "Veyari envoy",
    nodes: [
      "You are not one of theirs. Your machine-heart is quiet. Good. I have had enough of loud hearts this week.",
      "We came for the same reason they did. The old energy under this basin. They woke it, and now it sings to their machines.",
      "My people call your machines 'corrupted'. The corrupted do not hate you. They simply follow the song.",
    ],
    choices: [
      {
        label: "Who are you?",
        reply: "Iri. Veyari. We keep the quiet places quiet. This basin was a quiet place once, before the drilling.",
        trust: 1,
        flag: "iri-met",
      },
      {
        label: "Why fight the machines?",
        reply: "Because they are converting the song into orders. Every corrupted unit makes the signal louder. Silence them, and the basin breathes.",
        trust: 1,
        flag: "iri-explained",
      },
      {
        label: "We need help.",
        reply: "Then help us quiet the machines. The guardians will not fire on you if you stand with us. This I can promise.",
        trust: 3,
        flag: "iri-alliance",
        mission: "machine-census",
      },
    ],
  },
};

export interface CinematicLine {
  speaker: string;
  text: string;
}

export const INTRO_LINES: CinematicLine[] = [
  { speaker: "AMANI NJOROGE", text: "Eight years away. The bus stopped where the tarmac turned to dust, and the dust still knew my name." },
  { speaker: "NARRATOR", text: "The Kijani Basin used to feed a district. Now the fields are pale, the pumps are quiet, and the machines move without drivers." },
  { speaker: "AMANI NJOROGE", text: "Mama Zuri said the water would come back. She said it the way people say things they need to be true." },
  { speaker: "NARRATOR", text: "Somewhere past the ridge, a signal is repeating. Patient. Intentional. Waiting to be answered." },
];

export const CRASH_LINES: CinematicLine[] = [
  { speaker: "NARRATOR", text: "A scar of scorched earth. Not a meteor. The broken ring is too regular, the dust too still." },
  { speaker: "AMANI NJOROGE", text: "That is not TerraNova hardware. Nothing in the basin is built like this." },
  { speaker: "NARRATOR", text: "Something in the wreck turns to look at you, and the air goes quiet in a way that feels deliberate." },
];
