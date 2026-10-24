/**
 * Starter health articles.
 *
 * These are general-information drafts written from public guidance (WHO, NHS, HSE, CDC, FDA). Each lists the pages it
 * draws on. They contain no dosing instructions beyond "follow the label", and they are always saved as
 * "needs review": in live mode none is shown until a named pharmacist has reviewed it in the admin console.
 */
export interface ArticleSeed {
  title: string;
  excerpt: string;
  /** Markdown */
  body: string;
  category: string;
  art: string;
  readMinutes: number;
  sources: { title: string; url: string }[];
}

const WHO = (path: string, title: string) => ({ title: `WHO: ${title}`, url: `https://www.who.int/news-room/fact-sheets/detail/${path}` });

export const ARTICLES: ArticleSeed[] = [
  {
    title: 'Using paracetamol safely',
    excerpt: 'Paracetamol is in many products. A few habits keep it safe: read the label, count every source, and never double up.',
    category: 'Medicines',
    art: 'pill',
    readMinutes: 3,
    body: `Paracetamol is one of the most widely used medicines for pain and fever. Used as directed it is well tolerated, but taking more than the recommended amount can seriously harm the liver. Most mistakes happen by accident.

## Read the label every time

The label on your pack tells you how much to take, how often, and the most you can take in a day. Follow it, and do not take extra because the pain is bad. If the label does not match what you were told by your doctor or pharmacist, ask before you take it.

## Count every source

Paracetamol is an ingredient in many cold and flu remedies, and in some stronger painkillers. Taking two products that both contain it is an easy way to take too much. Check the "active ingredients" on each pack, and if you are unsure, ask a pharmacist before combining anything.

## Take extra care if

- you weigh much less than the average adult,
- you drink alcohol regularly or have a liver problem,
- you are pregnant or breastfeeding,
- you are giving it to a child. Children's doses depend on weight and on the product. Use the measure supplied with that product and follow the label, or ask a pharmacist.

## If too much has been taken

Do not wait for symptoms. Taking too much paracetamol can cause liver damage even when you feel well at first. Seek medical help straight away.

## When to see a health professional

If pain or fever lasts for more than a few days, keeps coming back, or you are worried, speak to a pharmacist or doctor rather than taking more.`,
    sources: [
      { title: 'HSE: Paracetamol', url: 'https://www2.hse.ie/medicines/paracetamol/' },
      { title: 'HSE: How and when to give your child paracetamol', url: 'https://www2.hse.ie/medicines/paracetamol-for-children/how-and-when-to-give-your-child-paracetamol/' },
    ],
  },
  {
    title: 'Oral rehydration: what to do when someone has diarrhoea',
    excerpt: 'The danger of diarrhoea is losing too much fluid. Oral rehydration salts replace it, and knowing the warning signs matters.',
    category: 'Family health',
    art: 'sachet',
    readMinutes: 4,
    body: `Diarrhoea is common, and most episodes pass. The real risk is dehydration, especially in babies, young children and older people.

## Replace what is lost

Oral rehydration salts (ORS) are a mix of salts and sugar that helps the body absorb water. Make them up exactly as the sachet says, using clean, safe water and the amount of water the instructions give. Do not make the solution stronger or weaker, and do not add sugar or salt yourself.

## Keep feeding

Breastfed babies should keep breastfeeding. Children and adults should keep eating and drinking as they are able; eating helps the gut recover.

## Zinc for children

Health agencies recommend zinc supplements as part of treating diarrhoea in children. Ask a pharmacist or health worker which product and how long to give it for your child.

## Warning signs: get medical help

- very little or no urine, a very dry mouth, sunken eyes,
- unusual sleepiness or irritability, or a child who will not drink,
- blood in the stool, a high fever, or severe tummy pain,
- vomiting that will not stop, or diarrhoea that lasts for several days.

Babies and very young children can become seriously ill quickly. If in doubt, go to a health facility.

## Prevention

Safe drinking water, washing hands with soap, and good food hygiene prevent most diarrhoea. See our guide to washing hands properly.`,
    sources: [WHO('diarrhoeal-disease', 'Diarrhoeal disease')],
  },
  {
    title: 'Understanding high blood pressure',
    excerpt: 'High blood pressure often has no symptoms, which is why checking it matters. Here is what it is and what helps.',
    category: 'Heart and blood pressure',
    art: 'heart',
    readMinutes: 4,
    body: `Blood pressure is the force of blood against the walls of your arteries. When it stays too high, it strains the heart and blood vessels and raises the risk of heart attack, stroke and kidney disease.

## Why you may not know

High blood pressure usually has no symptoms. Many people only find out when it is measured, so a regular check is worthwhile, especially if it runs in your family or you are over 40.

## What a reading means

A reading has two numbers, for example 120/80. The first is the pressure as the heart beats; the second is the pressure between beats. A single high reading does not mean you have hypertension. A doctor or nurse will look at repeated measurements.

## What can help

These habits are widely recommended to help lower or prevent high blood pressure:

- eat less salt and fewer heavily processed foods,
- eat more vegetables, fruit and whole foods,
- stay physically active,
- keep a healthy weight,
- avoid tobacco, and limit alcohol.

## If you are prescribed tablets

Take them as directed and do not stop because you feel well. High blood pressure medicines work by keeping the pressure down; stopping them lets it rise again. Talk to your doctor or pharmacist about side effects rather than stopping on your own.

## Seek urgent help if

you have chest pain, sudden weakness on one side, difficulty speaking, a severe headache, or sudden loss of vision.`,
    sources: [WHO('hypertension', 'Hypertension')],
  },
  {
    title: 'Malaria: protection, signs and when to test',
    excerpt: 'Malaria is preventable and treatable, but it can become serious quickly. Know the signs and where to get tested.',
    category: 'Infections',
    art: 'test',
    readMinutes: 4,
    body: `Malaria is a disease caused by parasites spread by the bite of infected mosquitoes. It is preventable and, caught early, treatable. It can become life-threatening, particularly in young children and pregnant women.

## Signs to watch for

Symptoms usually include fever, chills, headache, body aches and tiredness, and sometimes vomiting or diarrhoea. They can look like flu. Because of this, a fever in a place where malaria occurs should be tested rather than guessed at.

## Get a test

Treatment depends on confirming malaria and, where possible, which type it is. A rapid diagnostic test or a laboratory test can do this. Go to a clinic, hospital or a pharmacy that offers testing. Do not treat yourself with leftover tablets.

## Finish treatment as prescribed

Antimalarial medicines must be taken as the health worker prescribes, for the whole course, even when you start to feel better.

## Prevent bites

- sleep under an insecticide-treated mosquito net,
- use window screens and, where advised, indoor residual spraying,
- use a repellent suitable for the person's age as directed on the label,
- remove standing water around the home where mosquitoes breed.

## Pregnancy and young children

Malaria is especially dangerous for pregnant women and children under five. Antenatal clinics offer preventive measures; follow their advice and seek care promptly for any fever.

## Go to a health facility urgently if

there is a fever with confusion, repeated vomiting, convulsions, difficulty breathing, very pale skin, or a person who cannot drink.`,
    sources: [WHO('malaria', 'Malaria')],
  },
  {
    title: 'Antibiotics: when they help and when they do not',
    excerpt: 'Antibiotics fight bacteria, not viruses. Using them wrongly makes them work less well for everyone.',
    category: 'Medicines',
    art: 'capsule',
    readMinutes: 4,
    body: `Antibiotics treat infections caused by bacteria. They do not work against viruses such as the ones that cause colds, flu and most sore throats and coughs.

## Why it matters

When antibiotics are used when they are not needed, or not taken properly, bacteria can adapt and become resistant. Infections then become harder to treat. This is called antimicrobial resistance, and it is a major global health threat.

## What you can do

- Only take antibiotics prescribed for you by a qualified health professional.
- Never ask for antibiotics for a cold or flu, and do not buy them without a prescription.
- Take them exactly as directed, for the full course the prescriber gave you, unless you are told to stop.
- Never share them or keep leftovers for the next illness.
- Do not take antibiotics prescribed for someone else.

## Prevent infections in the first place

Wash your hands, keep vaccinations up to date, prepare food safely, and practise safer sex. Fewer infections means fewer antibiotics needed.

## Side effects

Tell your pharmacist or doctor if you get a rash, swelling of the face or lips, difficulty breathing, or severe diarrhoea. Seek urgent help for breathing difficulty or swelling.

## Antibiotics are prescription medicines

Antibiotics should be supplied on a prescription. They are never sold through the online basket here. If you have a prescription, you can send it to the pharmacist for review.`,
    sources: [WHO('antimicrobial-resistance', 'Antimicrobial resistance')],
  },
  {
    title: 'Sun safety for every skin tone',
    excerpt: 'Everyone can be harmed by too much sun. Shade, clothing and a good sunscreen all help.',
    category: 'Skin and beauty',
    art: 'sun',
    readMinutes: 3,
    body: `Darker skin has more natural protection, but it is not immune. Sun exposure can still cause sunburn, skin damage and, over time, skin cancer. Protection is for everyone.

## Use more than one layer

1. **Shade.** Seek it, especially in the middle of the day when the sun is strongest.
2. **Clothing.** Long, loose clothing, a wide-brimmed hat and sunglasses reduce exposure.
3. **Sunscreen.** Use it on the skin that clothing does not cover.

## Choosing a sunscreen

Look for a product that protects against both UVB and UVA, labelled broad spectrum. A higher SPF (sun protection factor) protects against UVB; a UVA rating protects against UVA. Choose one you will actually use.

## Using it well

- Apply it generously and spread it evenly. Most people put on too little.
- Apply it before going out, and reapply regularly, and after swimming, sweating or towel drying.
- Sunscreen is not a reason to stay out longer in the sun.
- Check the expiry date, and keep it out of hot places such as a parked car.

## Babies

Keep babies out of strong sun. Use shade and clothing rather than relying on sunscreen, and ask a pharmacist about suitable products for young children.

## See a doctor if

a mole changes in size, shape or colour, bleeds, or a sore does not heal.`,
    sources: [{ title: 'NHS: Sunscreen and sun safety', url: 'https://www.nhs.uk/live-well/seasonal-health/sunscreen-and-sun-safety/' }],
  },
  {
    title: 'Looking after yourself with a cold',
    excerpt: 'A cold gets better by itself. Rest, fluids and simple comforts help, and some signs mean it is not just a cold.',
    category: 'Everyday health',
    art: 'thermometer',
    readMinutes: 3,
    body: `A cold is caused by a virus. There is no cure, and antibiotics do not help, but most people feel better within a week or two.

## What helps

- **Rest** and get plenty of sleep.
- **Drink fluids**, especially water, to avoid dehydration.
- **Ease symptoms.** Painkillers such as paracetamol can help with aches and fever (follow the label). Salt-water gargles may soothe a sore throat, and a saline nasal spray or rinse may ease a blocked nose.
- **Stay warm and comfortable** and keep the air in the room fresh.

## Preventing the spread

Colds spread through droplets from coughs and sneezes, and on hands and surfaces. Wash your hands often, cough or sneeze into a tissue or your elbow, bin used tissues, and stay home if you can while you have a fever.

## Ask a pharmacist before using cold remedies if

you are pregnant or breastfeeding, have high blood pressure, heart disease or diabetes, take other medicines, or the medicine is for a child. Many cold remedies combine several ingredients, including paracetamol.

## See a doctor if

- symptoms last much longer than three weeks,
- you have difficulty breathing, chest pain, or a very high temperature,
- a baby or young child is very unwell, or not feeding or drinking,
- you have a long-term health condition and are getting worse.`,
    sources: [{ title: 'NHS: Common cold', url: 'https://www.nhs.uk/conditions/common-cold/' }],
  },
  {
    title: 'A healthy diet: the basics',
    excerpt: 'You do not need a special plan. Plenty of vegetables, fruit and whole foods, and less salt, sugar and unhealthy fat, go a long way.',
    category: 'Nutrition',
    art: 'leaf',
    readMinutes: 4,
    body: `Eating well protects against many long-term illnesses, including heart disease, diabetes and some cancers. The principles are simple.

## What to eat more of

- vegetables and fruit, in variety,
- legumes such as beans, lentils and groundnuts,
- nuts and whole grains,
- fish, and unprocessed foods in general.

## What to limit

- **Salt.** Too much raises blood pressure. Go easy on stock cubes, salty snacks and processed foods, and taste before adding salt.
- **Free sugars.** Sugary drinks, sweets and sweet baked goods add energy with little nourishment.
- **Unhealthy fats.** Prefer unsaturated fats (found in fish, nuts and most vegetable oils) to saturated fats, and avoid industrially produced trans fats.

## Drink water

Water is the best drink. Sugary drinks add up quickly.

## Babies and young children

Breastfeeding gives babies the best start. Ask your clinic or health worker about when and how to introduce other foods.

## Supplements

Most people who eat a varied diet do not need vitamin supplements. If you think you need one, for example because of pregnancy, a restricted diet or a health condition, speak to a pharmacist or doctor first, as some supplements interact with medicines.`,
    sources: [WHO('healthy-diet', 'Healthy diet')],
  },
  {
    title: 'Keeping teeth and gums healthy',
    excerpt: 'Brushing twice a day with fluoride toothpaste, cutting back on sugar and seeing a dentist protect your teeth for life.',
    category: 'Oral care',
    art: 'tooth',
    readMinutes: 3,
    body: `Cavities and gum disease are among the most common health problems in the world, and most are preventable.

## Everyday habits

- **Brush twice a day** with a fluoride toothpaste. Fluoride strengthens teeth and helps prevent decay.
- **Clean between your teeth** daily, with floss or interdental brushes.
- **Limit sugar**, especially sugary drinks and sweets between meals.
- **Avoid tobacco**, which harms gums and raises the risk of mouth cancer. Limit alcohol too.
- **Replace your toothbrush** when the bristles are worn.

## Children

Start brushing as soon as the first teeth appear. Use the amount of toothpaste and the fluoride strength recommended for the child's age, and supervise brushing until they can do it well. Ask your dentist or pharmacist if unsure.

## See a dentist if

- you have toothache, swelling, or a loose tooth,
- your gums bleed regularly or you have bad breath that does not go away,
- you have a mouth sore that does not heal within a few weeks.

Pain and swelling in the face with a fever or difficulty swallowing needs urgent attention.`,
    sources: [WHO('oral-health', 'Oral health')],
  },
  {
    title: 'Keeping active: how much is enough?',
    excerpt: 'Any movement counts. Adults are encouraged to do a little every day and to build up gradually.',
    category: 'Everyday health',
    art: 'bone',
    readMinutes: 3,
    body: `Regular physical activity lowers the risk of heart disease, stroke, type 2 diabetes and some cancers, and it helps mental health, sleep and healthy ageing.

## The general guidance

For adults, WHO recommends at least 150 minutes of moderate-intensity activity a week (such as brisk walking), or 75 minutes of vigorous activity, along with muscle-strengthening activities on two or more days. Children and teenagers are advised to be active for an average of about an hour a day.

Doing some activity is better than none, and more is better still, up to a point.

## Making it easier

- Break it into short sessions: ten minutes counts.
- Walk or cycle instead of riding where you can.
- Take the stairs, and stand up and move during long periods of sitting.
- Find something you enjoy, or do it with someone.

## Start gently

If you have not been active for a while, start slowly and build up. Speak to a doctor first if you have a heart condition, chest pain, dizziness, a long-term illness or are pregnant.

## Stop and get help if

you get chest pain, severe breathlessness, or feel faint during activity.`,
    sources: [WHO('physical-activity', 'Physical activity')],
  },
  {
    title: 'How to wash your hands properly',
    excerpt: 'Washing with soap and water is one of the simplest ways to prevent infections. Technique and timing matter.',
    category: 'Everyday health',
    art: 'drop',
    readMinutes: 2,
    body: `Clean hands help stop the spread of illnesses such as diarrhoea, colds, flu and many others.

## When to wash

- before preparing or eating food,
- after using the toilet or changing a nappy,
- after coughing, sneezing or blowing your nose,
- after touching animals or waste, and before and after caring for someone who is sick,
- whenever your hands look dirty.

## How to wash

1. Wet your hands with clean water.
2. Apply enough soap to cover all surfaces.
3. Rub your palms together, then the backs of your hands, between your fingers, around your thumbs and under your nails.
4. Keep going for about 20 seconds.
5. Rinse well under running water.
6. Dry with a clean towel or let them air dry.

## If there is no soap and water

An alcohol-based hand rub is a good alternative when hands are not visibly dirty. Wash with soap and water when they are.

## Teaching children

Make it a habit at the same moments every day, and wash alongside them.`,
    sources: [
      { title: 'WHO: How to handwash', url: 'https://www.who.int/docs/default-source/patient-safety/how-to-handwash-poster.pdf' },
      { title: 'CDC: About handwashing', url: 'https://www.cdc.gov/clean-hands/about/index.html' },
    ],
  },
  {
    title: 'Storing and disposing of medicines at home',
    excerpt: 'Where you keep medicines, and what you do with old ones, protects children and keeps medicines working.',
    category: 'Medicines',
    art: 'bottle',
    readMinutes: 3,
    body: `Medicines are safest, and work best, when they are stored and discarded properly.

## Storing medicines

- **Out of sight and reach of children.** Use a high shelf or a cupboard with a lock. Child-resistant caps help, but are not child-proof.
- **Follow the storage instructions** on the pack. Most medicines are kept in a cool, dry place away from direct sunlight. A bathroom or a hot kitchen is rarely a good choice, and a parked car is worse.
- **Keep them in the original container**, with the label and leaflet, so you know what each is and how to use it.
- **Keep refrigerated medicines** in the fridge if the label says so.
- **Never share** medicines, and do not decant them into unlabelled bottles.

## Check expiry dates

Do not use medicines after their expiry date, and do not use any that look or smell different, or that have changed colour. Expired medicines may not work properly, and some can become unsafe.

## Getting rid of medicines

Return unused or expired medicines to a pharmacy or collection point if one is available. Do not leave them where children or animals could reach them. Ask your pharmacist how to dispose of a particular medicine safely, including liquids and needles.

## If a child swallows a medicine

Seek medical help immediately. Do not wait for symptoms. Take the pack with you.`,
    sources: [
      { title: 'FDA: Don’t be tempted to use expired medicines', url: 'https://www.fda.gov/drugs/safe-disposal-medicines/dont-be-tempted-use-expired-medicines' },
      { title: 'CDC: Prescription medicine, tips for safe storage', url: 'https://www.cdc.gov/wtc/prescriptionsafety.html' },
    ],
  },
];
