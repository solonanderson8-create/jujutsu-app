/*
 * THE DATA — every position, category and technique, and how they connect.
 *
 * Think of this file as the parts list for the whole machine. The graph code
 * only reads from here, so to add a move you just add one line below.
 *
 * Three levels, like zooming in on a map:
 *   positions  (countries)  -> e.g. "Mount"
 *   categories (cities)     -> e.g. "Top: Attacks"
 *   techniques (streets)    -> e.g. "Americana"
 *
 * Links inside a technique point at other ids. An id can be a technique
 * ("armbar-mount") or a whole position ("mount").
 */
(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // POSITIONS — the big bubbles you see fully zoomed out.
  // x / y are where they sit on the map (bigger y = further down).
  // ---------------------------------------------------------------------------
  const positions = [
    { id: 'standing', name: 'Standing', x: 0, y: 0, color: '#8b93a7',
      blurb: 'Both people on their feet. Every match starts here. You fight for grips, then choose: take them down, or pull guard.' },
    { id: 'takedowns', name: 'Takedowns', x: 1350, y: 250, color: '#e0a458',
      blurb: 'The bridge from standing to the ground. The goal is to land on top in a strong position.' },
    { id: 'closed-guard', name: 'Closed Guard', x: -1350, y: 1450, color: '#5fa8d3',
      blurb: 'One person is on their back with their legs locked around the other person\'s waist. Bottom attacks with sweeps and submissions. Top tries to open the legs.' },
    { id: 'open-guard', name: 'Open Guard', x: 0, y: 1450, color: '#62b6cb',
      blurb: 'Bottom player\'s legs are unlocked and used as hooks and frames, like a toolbox instead of a padlock. Top player tries to get past the legs (a "pass").' },
    { id: 'half-guard', name: 'Half Guard', x: 1350, y: 1600, color: '#4ecdc4',
      blurb: 'Bottom player traps one of top player\'s legs. Halfway between guard and being passed.' },
    { id: 'turtle', name: 'Turtle', x: -1350, y: 2850, color: '#a3b18a',
      blurb: 'Bottom player is on knees and elbows, curled up like a shell to protect the neck. A short-lived, in-between position.' },
    { id: 'side-control', name: 'Side Control', x: 0, y: 2850, color: '#f28482',
      blurb: 'Top player has passed the legs and pins chest-to-chest from the side. Bottom player needs to escape before things get worse.' },
    { id: 'knee-on-belly', name: 'Knee on Belly', x: 1350, y: 2950, color: '#f6bd60',
      blurb: 'Top player puts a knee on bottom player\'s stomach with the other leg posted out. Very mobile and very uncomfortable for the person underneath.' },
    { id: 'back-control', name: 'Back Control', x: -700, y: 4100, color: '#b392ac',
      blurb: 'You are behind them with your hooks in or a body triangle. The most dominant position in BJJ, because they can\'t see your attacks coming.' },
    { id: 'mount', name: 'Mount', x: 700, y: 4100, color: '#e76f51',
      blurb: 'Top player sits on bottom player\'s torso with knees on the mat. One of the strongest positions: gravity works for the top player.' },
  ];

  // ---------------------------------------------------------------------------
  // FLOWS — the big arrows between positions (the "roads" on the map).
  // ---------------------------------------------------------------------------
  const flows = [
    { from: 'standing', to: 'takedowns', label: 'shoot / throw' },
    { from: 'standing', to: 'closed-guard', label: 'pull guard' },
    { from: 'standing', to: 'open-guard', label: 'sit to guard' },
    { from: 'takedowns', to: 'side-control', label: 'land on top' },
    { from: 'takedowns', to: 'half-guard', label: 'land in half' },
    { from: 'takedowns', to: 'back-control', label: 'arm drag' },
    { from: 'takedowns', to: 'turtle', label: 'sprawl' },
    { from: 'closed-guard', to: 'mount', label: 'sweep' },
    { from: 'closed-guard', to: 'back-control', label: 'arm drag' },
    { from: 'closed-guard', to: 'open-guard', label: 'guard break' },
    { from: 'open-guard', to: 'side-control', label: 'pass' },
    { from: 'open-guard', to: 'half-guard', label: 'half pass' },
    { from: 'open-guard', to: 'mount', label: 'sweep' },
    { from: 'half-guard', to: 'side-control', label: 'pass / sweep' },
    { from: 'half-guard', to: 'back-control', label: 'dogfight' },
    { from: 'half-guard', to: 'mount', label: 'pass' },
    { from: 'side-control', to: 'mount', label: 'transition' },
    { from: 'side-control', to: 'knee-on-belly', label: 'transition' },
    { from: 'side-control', to: 'turtle', label: 'escape' },
    { from: 'knee-on-belly', to: 'mount', label: 'transition' },
    { from: 'mount', to: 'back-control', label: 'they turn' },
    { from: 'mount', to: 'half-guard', label: 'escape' },
    { from: 'turtle', to: 'back-control', label: 'take the back' },
    { from: 'turtle', to: 'standing', label: 'stand up' },
    { from: 'back-control', to: 'half-guard', label: 'escape' },
  ];

  // ---------------------------------------------------------------------------
  // CATEGORIES — the middle zoom level. Each one lives inside a position.
  // ---------------------------------------------------------------------------
  const categories = [
    { id: 'st-grips', name: 'Grips & Ties', position: 'standing' },
    { id: 'st-pulls', name: 'Guard Pulls', position: 'standing' },

    { id: 'td-wrestling', name: 'Wrestling', position: 'takedowns' },
    { id: 'td-judo', name: 'Judo Throws', position: 'takedowns' },
    { id: 'td-defense', name: 'Takedown Defense', position: 'takedowns' },

    { id: 'cg-sweeps', name: 'Sweeps (Bottom)', position: 'closed-guard' },
    { id: 'cg-subs', name: 'Submissions (Bottom)', position: 'closed-guard' },
    { id: 'cg-back', name: 'Back Takes (Bottom)', position: 'closed-guard' },
    { id: 'cg-top', name: 'Guard Breaks (Top)', position: 'closed-guard' },

    { id: 'og-guards', name: 'Guard Types (Bottom)', position: 'open-guard' },
    { id: 'og-sweeps', name: 'Sweeps (Bottom)', position: 'open-guard' },
    { id: 'og-leglocks', name: 'Leg Locks (Bottom)', position: 'open-guard' },
    { id: 'og-pass', name: 'Guard Passing (Top)', position: 'open-guard' },

    { id: 'hg-bottom', name: 'Bottom', position: 'half-guard' },
    { id: 'hg-top', name: 'Top', position: 'half-guard' },

    { id: 'tu-top', name: 'Top', position: 'turtle' },
    { id: 'tu-bottom', name: 'Bottom', position: 'turtle' },

    { id: 'sc-top', name: 'Top: Attacks & Transitions', position: 'side-control' },
    { id: 'sc-bottom', name: 'Bottom: Escapes', position: 'side-control' },

    { id: 'kob-top', name: 'Top', position: 'knee-on-belly' },
    { id: 'kob-bottom', name: 'Bottom', position: 'knee-on-belly' },

    { id: 'bc-control', name: 'Control', position: 'back-control' },
    { id: 'bc-attacks', name: 'Attacks', position: 'back-control' },
    { id: 'bc-bottom', name: 'Bottom: Escapes', position: 'back-control' },

    { id: 'mt-top', name: 'Top: Attacks', position: 'mount' },
    { id: 'mt-bottom', name: 'Bottom: Escapes', position: 'mount' },
  ];

  // ---------------------------------------------------------------------------
  // TECHNIQUES — the individual moves.
  //
  // t(id, name, category, style, description, success, fail, related)
  //   style:   'both' | 'gi' | 'nogi'
  //   success: where to go if the move works
  //   fail:    what to try if it doesn't
  //   related: other moves worth knowing
  // ---------------------------------------------------------------------------
  const t = (id, name, category, style, desc, success = [], fail = [], related = []) => ({
    id, name, category, desc, success, fail, related,
    gi: style !== 'nogi',
    nogi: style !== 'gi',
  });

  const techniques = [
    // ---- Standing: Grips & Ties ----
    t('collar-tie', 'Collar Tie', 'st-grips', 'both',
      'Hand behind their neck, elbow pressed into their collarbone like a lever. You can pull their head down and feel which way they are moving.',
      ['single-leg', 'double-leg', 'snap-down'], ['underhook-pummel'], ['two-on-one']),
    t('underhook-pummel', 'Underhook Pummel', 'st-grips', 'both',
      'Swim your arm under their armpit and lift. An underhook is like a jack under their shoulder: it tilts them up and makes their legs light.',
      ['osoto-gari', 'single-leg'], ['collar-tie'], ['two-on-one']),
    t('two-on-one', 'Two-on-One (Russian Tie)', 'st-grips', 'both',
      'Both your hands on one of their arms. Two hands beat one, so you control that whole side of their body.',
      ['arm-drag-standing', 'single-leg'], ['collar-tie'], ['arm-drag-guard']),
    t('collar-sleeve', 'Collar & Sleeve Grip', 'st-grips', 'gi',
      'One hand on their lapel, the other on their sleeve at the wrist. Like the handlebars of a bike: you steer their upper body.',
      ['osoto-gari', 'seoi-nage', 'pull-closed-guard'], [], ['scissor-sweep']),
    t('snap-down', 'Snap Down', 'st-grips', 'both',
      'From a collar tie, yank their head down sharply so their hands hit the mat. Their weight falls forward onto you.',
      ['guillotine-standing', 'turtle', 'ankle-pick'], ['collar-tie'], ['sprawl']),

    // ---- Standing: Guard Pulls ----
    t('pull-closed-guard', 'Pull Closed Guard', 'st-pulls', 'both',
      'Get a grip, sit or jump, and wrap your legs around their waist with ankles locked. You choose to fight from your back.',
      ['closed-guard'], ['open-guard'], ['collar-sleeve']),
    t('sit-to-butterfly', 'Sit to Butterfly Guard', 'st-pulls', 'both',
      'Sit down in front of them and slide both feet in as hooks between their thighs.',
      ['butterfly-guard'], ['half-guard'], ['butterfly-sweep']),

    // ---- Takedowns: Wrestling ----
    t('double-leg', 'Double Leg', 'td-wrestling', 'both',
      'Drop your hips (change levels), step deep between their feet, wrap both legs and drive through them like pushing a stalled car. Head on the outside.',
      ['side-control', 'half-guard'], ['single-leg', 'sprawl'], ['single-leg']),
    t('single-leg', 'Single Leg', 'td-wrestling', 'both',
      'Grab one leg and hug it to your chest. Lift and turn, or "run the pipe" (drive at an angle) to knock them over.',
      ['side-control', 'half-guard'], ['double-leg', 'turtle'], ['ankle-pick']),
    t('ankle-pick', 'Ankle Pick', 'td-wrestling', 'both',
      'Snap their head down so their weight shifts onto their front foot, then pick up that ankle. Like kicking out a table leg while someone leans on it.',
      ['side-control'], ['single-leg'], ['snap-down', 'collar-tie']),
    t('arm-drag-standing', 'Arm Drag to Back', 'td-wrestling', 'both',
      'Pull their arm across your body and past you, like yanking a door open, then step behind them.',
      ['back-control', 'double-leg'], ['two-on-one'], ['arm-drag-guard']),

    // ---- Takedowns: Judo ----
    t('osoto-gari', 'Osoto Gari (Major Outer Reap)', 'td-judo', 'both',
      'Tip their weight back onto one heel, then reap that leg out from behind with yours. Like kicking the last leg out from under a tilted chair.',
      ['side-control'], ['double-leg'], ['collar-sleeve', 'underhook-pummel']),
    t('seoi-nage', 'Seoi Nage (Shoulder Throw)', 'td-judo', 'gi',
      'Turn in under them, load them onto your back, and bend forward. Your hips are the pivot of a lever that pitches them over your shoulder.',
      ['side-control'], ['osoto-gari'], ['collar-sleeve', 'uchi-mata']),
    t('uchi-mata', 'Uchi Mata (Inner Thigh Throw)', 'td-judo', 'gi',
      'Pull them forward onto their toes, then swing your leg up between theirs to lift them over, like a pendulum.',
      ['side-control'], ['seoi-nage'], ['osoto-gari']),

    // ---- Takedowns: Defense ----
    t('sprawl', 'Sprawl', 'td-defense', 'both',
      'Shoot your legs back and drop your hips onto their head and shoulders. You become a heavy wedge they can\'t drive through.',
      ['guillotine-standing', 'turtle'], ['pull-closed-guard'], ['snap-down']),
    t('guillotine-standing', 'Guillotine (Standing)', 'td-defense', 'both',
      'Wrap your arm around their neck from the front, forearm blade under the chin. Clasp hands, pull up, push your hips forward.',
      [], ['pull-closed-guard'], ['guillotine-guard']),

    // ---- Closed Guard: Sweeps ----
    t('scissor-sweep', 'Scissor Sweep', 'cg-sweeps', 'both',
      'Shin across their belly, bottom leg chops behind their knee. Pull their upper body in as your legs scissor, like knocking over a sawhorse.',
      ['mount'], ['hip-bump-sweep', 'flower-sweep'], ['collar-sleeve']),
    t('hip-bump-sweep', 'Hip Bump Sweep', 'cg-sweeps', 'both',
      'When they sit up tall, sit up too, post a hand behind you, and bump your hip into them to roll them over.',
      ['mount'], ['kimura-guard', 'guillotine-guard'], ['scissor-sweep']),
    t('flower-sweep', 'Flower (Pendulum) Sweep', 'cg-sweeps', 'both',
      'Trap an arm and grab the far leg. Swing your leg like a pendulum to lift them and roll them toward the trapped arm, so they can\'t post.',
      ['mount'], ['armbar-guard'], ['scissor-sweep']),

    // ---- Closed Guard: Submissions ----
    t('armbar-guard', 'Armbar', 'cg-subs', 'both',
      'Control an arm, foot on their hip, spin sideways, and swing your leg over their head. Their elbow is a hinge; your hips bend it the wrong way.',
      [], ['triangle', 'omoplata', 'flower-sweep'], ['armbar-mount']),
    t('triangle', 'Triangle Choke', 'cg-subs', 'both',
      'One of their arms in, one out. Lock your legs in a figure-four around their neck and the trapped arm. Their own shoulder squeezes one side of their neck.',
      [], ['armbar-guard', 'omoplata'], ['spider-guard']),
    t('omoplata', 'Omoplata', 'cg-subs', 'both',
      'Swing your leg over their shoulder and turn to face their feet. Your legs crank their shoulder like turning a wrench. Often turns into a sweep.',
      ['side-control'], ['triangle'], ['lasso-guard']),
    t('kimura-guard', 'Kimura', 'cg-subs', 'both',
      'Grab their wrist, reach over their arm and grab your own wrist (a figure-four), then rotate their hand up behind their back.',
      [], ['hip-bump-sweep', 'guillotine-guard'], ['kimura-top']),
    t('guillotine-guard', 'Guillotine', 'cg-subs', 'both',
      'Wrap their neck from the front as they posture down, close your guard, and arch while pulling up on the chin.',
      [], ['hip-bump-sweep'], ['guillotine-standing']),
    t('cross-collar', 'Cross Collar Choke', 'cg-subs', 'gi',
      'Deep grip in one side of their collar, other hand crosses to the other side. Pull your elbows apart and down, like wringing out a towel.',
      [], ['armbar-guard'], ['cross-collar-mount']),

    // ---- Closed Guard: Back Takes ----
    t('arm-drag-guard', 'Arm Drag', 'cg-back', 'both',
      'Drag their arm across your body, sit up to their side, and climb onto their back.',
      ['back-control'], ['hip-bump-sweep'], ['arm-drag-standing', 'two-on-one']),

    // ---- Closed Guard: Guard Breaks (Top) ----
    t('posture', 'Posture Up', 'cg-top', 'both',
      'Straight spine, head up, hands on their hips or belly. A straight post is hard to bend. Everything in top closed guard starts here.',
      ['standing-guard-break', 'kneeling-guard-break'], [], []),
    t('standing-guard-break', 'Standing Guard Break', 'cg-top', 'both',
      'From good posture, stand up one leg at a time. Gravity pulls their legs down and apart, then you push a knee to open the lock.',
      ['open-guard', 'toreando'], ['posture'], ['kneeling-guard-break']),
    t('kneeling-guard-break', 'Kneeling Guard Break', 'cg-top', 'both',
      'Knee in their tailbone, the other leg back. Push their hip down to pry the ankles open, like opening a stiff clamp.',
      ['open-guard', 'knee-slice'], ['standing-guard-break'], ['posture']),

    // ---- Open Guard: Guard Types ----
    t('butterfly-guard', 'Butterfly Guard', 'og-guards', 'both',
      'Sit up with both feet hooked inside their thighs. Your hooks are like the forks of a forklift under their legs.',
      ['butterfly-sweep', 'single-leg-x'], ['half-guard'], ['sit-to-butterfly']),
    t('de-la-riva', 'De La Riva Guard', 'og-guards', 'both',
      'One leg hooks around the outside of their front leg from behind, and you grab that ankle. You hang on their leg like a hook on a pole.',
      ['x-guard', 'tripod-sweep'], ['half-guard'], ['spider-guard']),
    t('spider-guard', 'Spider Guard', 'og-guards', 'gi',
      'Grip both sleeves and press your feet into their biceps. Your legs are pistons pushing their arms away.',
      ['triangle', 'omoplata'], ['lasso-guard'], ['de-la-riva']),
    t('lasso-guard', 'Lasso Guard', 'og-guards', 'gi',
      'Wrap your leg around the outside of their arm and over it while gripping the sleeve. Their arm is stuck in a coil of rope.',
      ['omoplata', 'triangle'], ['spider-guard'], []),
    t('x-guard', 'X-Guard', 'og-guards', 'both',
      'Get under them with your legs crossed in an X around one of their legs. You lift them like a car on a jack, then tip them over.',
      ['side-control'], ['single-leg-x'], ['butterfly-guard']),
    t('single-leg-x', 'Single Leg X (Ashi Garami)', 'og-guards', 'both',
      'Trap one of their legs between yours with a foot on their hip. A hub for sweeps and leg locks.',
      ['straight-ankle-lock', 'heel-hook', 'side-control'], ['x-guard'], ['kneebar']),

    // ---- Open Guard: Sweeps ----
    t('butterfly-sweep', 'Butterfly (Hook) Sweep', 'og-sweeps', 'both',
      'Get an underhook, fall to your side, and lift with your hook like a catapult arm to toss them over.',
      ['mount', 'side-control'], ['single-leg-x', 'half-guard'], ['butterfly-guard']),
    t('tripod-sweep', 'Tripod Sweep', 'og-sweeps', 'both',
      'Hook behind one heel and push their other hip with your foot. A person standing is a two-legged stool; take one leg away and they tip backward.',
      ['side-control'], ['de-la-riva'], ['x-guard']),

    // ---- Open Guard: Leg Locks ----
    t('straight-ankle-lock', 'Straight Ankle Lock', 'og-leglocks', 'both',
      'Trap their foot in your armpit, blade your wrist under their Achilles tendon, and arch back.',
      [], ['single-leg-x', 'kneebar'], ['heel-hook']),
    t('heel-hook', 'Heel Hook', 'og-leglocks', 'nogi',
      'Trap the leg, cup the heel, and rotate. The knee is a hinge not built to twist, so this is dangerous: train it slowly and tap early. Banned in most gi rulesets.',
      [], ['straight-ankle-lock'], ['single-leg-x']),
    t('kneebar', 'Kneebar', 'og-leglocks', 'both',
      'Hug their leg, hips against the back of their knee, and extend. Like an armbar, but for the leg.',
      [], ['straight-ankle-lock'], ['armbar-guard']),

    // ---- Open Guard: Passing (Top) ----
    t('toreando', 'Toreando Pass', 'og-pass', 'both',
      'Grip their knees or pants, throw their legs to one side like a bullfighter moving a cape, and run around to side control.',
      ['side-control', 'sc-to-kob'], ['knee-slice', 'leg-drag'], ['leg-drag']),
    t('knee-slice', 'Knee Slice (Knee Cut)', 'og-pass', 'both',
      'Drive your knee diagonally across their thigh while crossfacing, like a blade cutting through.',
      ['side-control', 'mount'], ['half-guard'], ['toreando']),
    t('leg-drag', 'Leg Drag', 'og-pass', 'both',
      'Pull their legs across your hip so their knees point away, then settle chest-to-chest.',
      ['side-control', 'back-control'], ['toreando'], ['toreando']),
    t('over-under', 'Over-Under Pass', 'og-pass', 'both',
      'One arm over a leg, one under the other. Stack their hips toward their head and walk around with heavy pressure.',
      ['side-control'], ['half-guard'], ['knee-slice']),

    // ---- Half Guard: Bottom ----
    t('knee-shield', 'Knee Shield (Z-Guard)', 'hg-bottom', 'both',
      'Top knee across their chest like a wall, bottom leg traps their leg. It keeps distance so they can\'t flatten you.',
      ['underhook-dogfight', 'kimura-guard'], ['deep-half'], []),
    t('underhook-dogfight', 'Underhook & Dogfight', 'hg-bottom', 'both',
      'Get the underhook and come up onto your knees beside them. Now you are both on your knees, and you have the better angle.',
      ['old-school-sweep', 'back-control'], ['knee-shield'], ['underhook-turtle']),
    t('old-school-sweep', 'Old School Sweep', 'hg-bottom', 'both',
      'From the underhook, grab their far ankle and drive into them so they fall over the leg you trapped.',
      ['side-control'], ['underhook-dogfight'], ['single-leg-turtle']),
    t('deep-half', 'Deep Half Guard', 'hg-bottom', 'both',
      'Dive under them and hug their leg. You\'re under their center of gravity, like a jack under a car.',
      ['side-control'], ['knee-shield'], ['x-guard']),

    // ---- Half Guard: Top ----
    t('crossface-flatten', 'Crossface & Underhook', 'hg-top', 'both',
      'Shoulder across their jaw turns their head away; underhook their far arm. Flat on their back, they can\'t sweep.',
      ['knee-slice', 'hg-mount-pass'], [], []),
    t('hg-mount-pass', 'Half Guard to Mount Pass', 'hg-top', 'both',
      'Free your trapped leg by pushing their knee down with your other foot, then slide straight over into mount.',
      ['mount'], ['crossface-flatten'], ['knee-slice']),

    // ---- Turtle: Top ----
    t('turtle-seatbelt', 'Seatbelt & Roll', 'tu-top', 'both',
      'Seatbelt grip from behind, sink one hook, then roll them over your side to take the back.',
      ['back-control'], ['crucifix'], ['seatbelt']),
    t('clock-choke', 'Clock Choke', 'tu-top', 'gi',
      'Feed their collar, sprawl your hips back and walk around their head like the hand of a clock.',
      [], ['turtle-seatbelt'], ['paper-cutter']),
    t('crucifix', 'Crucifix', 'tu-top', 'both',
      'Trap one arm with your legs and the other with your arm, then roll them so both arms are pinned. Chokes and armlocks follow.',
      ['armbar-back'], ['turtle-seatbelt'], []),

    // ---- Turtle: Bottom ----
    t('granby', 'Granby Roll', 'tu-bottom', 'both',
      'Tuck and roll across your shoulders to spin back around to guard.',
      ['open-guard', 'closed-guard'], ['sit-out'], []),
    t('sit-out', 'Sit-Out', 'tu-bottom', 'both',
      'Post a hand, kick a leg through underneath you, sit and turn to face them.',
      ['half-guard', 'single-leg-turtle'], ['granby'], ['technical-standup']),
    t('technical-standup', 'Technical Stand-Up', 'tu-bottom', 'both',
      'Post a hand and the opposite foot, lift your hips, and sweep your leg back under you to stand up safely.',
      ['standing'], ['sit-out'], []),
    t('single-leg-turtle', 'Single Leg from Knees', 'tu-bottom', 'both',
      'From your knees, grab a leg and come up into a single-leg finish.',
      ['side-control'], ['sit-out'], ['single-leg']),

    // ---- Side Control: Top ----
    t('americana', 'Americana', 'sc-top', 'both',
      'Pin their wrist to the mat, figure-four their arm, then slide their hand toward their hip like a windshield wiper while lifting the elbow.',
      [], ['kimura-top', 'sc-to-mount'], ['kimura-top']),
    t('kimura-top', 'Kimura', 'sc-top', 'both',
      'Figure-four grip on their arm, then rotate their hand behind their back.',
      [], ['americana', 'armbar-mount'], ['kimura-guard']),
    t('arm-triangle', 'Arm Triangle', 'sc-top', 'both',
      'Trap their head and one arm inside your arms, drop to the side, and squeeze. Their own shoulder does the choking.',
      [], ['mount'], ['triangle']),
    t('paper-cutter', 'Paper Cutter Choke', 'sc-top', 'gi',
      'Feed their collar, then drop your forearm across their throat like closing a paper cutter.',
      [], ['sc-to-mount'], ['clock-choke']),
    t('sc-to-mount', 'Knee Slide to Mount', 'sc-top', 'both',
      'Slide your knee across their belly and swing into mount, keeping chest pressure on them the whole time.',
      ['mount'], ['sc-to-kob'], []),
    t('sc-to-kob', 'Switch to Knee on Belly', 'sc-top', 'both',
      'Pop up and put your knee on their stomach, other leg posted wide.',
      ['knee-on-belly'], ['sc-to-mount'], []),

    // ---- Side Control: Bottom ----
    t('shrimp-reguard', 'Shrimp to Guard', 'sc-bottom', 'both',
      'Frame on their neck and hip, then shrimp (push your hips away) to make space and feed your knee back in.',
      ['closed-guard', 'half-guard'], ['underhook-turtle'], ['elbow-knee']),
    t('underhook-turtle', 'Underhook to Knees', 'sc-bottom', 'both',
      'Get an underhook, turn toward them onto your knees, and come up.',
      ['single-leg-turtle', 'turtle'], ['shrimp-reguard'], ['underhook-dogfight']),

    // ---- Knee on Belly: Top ----
    t('far-side-armbar', 'Far-Side Armbar', 'kob-top', 'both',
      'When they push on your knee, step around their head and fall into an armbar on the arm they pushed with.',
      [], ['side-control'], ['armbar-mount']),
    t('kob-to-mount', 'Knee on Belly to Mount', 'kob-top', 'both',
      'If they turn toward you, slide your knee straight over into mount.',
      ['mount'], ['side-control'], []),
    t('baseball-bat-choke', 'Baseball Bat Choke', 'kob-top', 'gi',
      'Both hands in their collar like gripping a bat, then spin around their head to tighten it.',
      [], ['kob-to-mount'], []),

    // ---- Knee on Belly: Bottom ----
    t('kob-escape', 'Push & Shrimp', 'kob-bottom', 'both',
      'Push their knee toward their butt (not up), turn in, and shrimp to recover guard.',
      ['closed-guard', 'half-guard'], ['underhook-turtle'], ['shrimp-reguard']),

    // ---- Back Control: Control ----
    t('seatbelt', 'Seatbelt & Hooks', 'bc-control', 'both',
      'One arm over their shoulder, one under their armpit, hands clasped like a seatbelt. Heels hooked inside their thighs.',
      ['rnc', 'bow-arrow'], ['body-triangle'], ['turtle-seatbelt']),
    t('body-triangle', 'Body Triangle', 'bc-control', 'both',
      'Lock your legs in a figure-four around their waist. Tighter than hooks and hard to shake off.',
      ['rnc'], ['seatbelt'], []),

    // ---- Back Control: Attacks ----
    t('rnc', 'Rear Naked Choke', 'bc-attacks', 'both',
      'Choking arm around the neck with the elbow under their chin. Grab your other bicep and put that hand behind their head. Squeeze like closing scissors.',
      [], ['armbar-back', 'bow-arrow'], ['arm-triangle']),
    t('bow-arrow', 'Bow & Arrow Choke', 'bc-attacks', 'gi',
      'Deep collar grip, grab their pants, and stretch them out like drawing a bow.',
      [], ['rnc'], ['cross-collar']),
    t('armbar-back', 'Armbar from Back', 'bc-attacks', 'both',
      'When they fight your choking hands, trap an arm, swing your leg over their head, and fall into an armbar.',
      [], ['mount'], ['armbar-mount']),

    // ---- Back Control: Escapes ----
    t('back-escape', 'Shoulder Walk Escape', 'bc-bottom', 'both',
      'Protect your neck with two hands on the choking arm. Walk your shoulders to the mat, clear their bottom hook, and turn in to face them.',
      ['half-guard'], ['granby'], []),

    // ---- Mount: Top ----
    t('armbar-mount', 'Armbar', 'mt-top', 'both',
      'When they push on you, isolate one arm, pivot, and fall back with your legs across their chest.',
      [], ['s-mount', 'side-control'], ['armbar-guard']),
    t('ezekiel', 'Ezekiel Choke', 'mt-top', 'both',
      'Thread one arm behind their neck and grab your own sleeve (or wrist), then drive the blade of your other hand across their throat.',
      [], ['armbar-mount'], []),
    t('s-mount', 'S-Mount', 'mt-top', 'both',
      'Shift your legs into an S shape with one arm trapped. A launch pad for armbars and chokes.',
      ['armbar-mount'], ['side-control'], []),
    t('cross-collar-mount', 'Cross Collar Choke', 'mt-top', 'gi',
      'Same as from guard: deep cross grips, then drop your elbows and head to the mat to tighten.',
      [], ['armbar-mount'], ['cross-collar']),
    t('arm-triangle-mount', 'Arm Triangle', 'mt-top', 'both',
      'Trap head and arm, slide off to the side, and squeeze.',
      [], ['side-control'], ['arm-triangle']),

    // ---- Mount: Bottom ----
    t('upa', 'Trap & Roll (Upa)', 'mt-bottom', 'both',
      'Trap one of their arms and the foot on the same side, then bridge high and roll over that shoulder. Take away their kickstand, then tip them.',
      ['closed-guard'], ['elbow-knee'], []),
    t('elbow-knee', 'Elbow-Knee Escape', 'mt-bottom', 'both',
      'Shrimp and wedge your elbow to your knee to push their leg down, then trap that leg to get half or full guard.',
      ['half-guard', 'closed-guard'], ['upa'], ['shrimp-reguard']),
  ];

  // Build a lookup table: id -> object (and tag each object with its type).
  const byId = {};
  positions.forEach(p => { p.type = 'position'; byId[p.id] = p; });
  categories.forEach(c => { c.type = 'category'; byId[c.id] = c; });
  techniques.forEach(tq => { tq.type = 'technique'; byId[tq.id] = tq; });

  window.JJ = window.JJ || {};
  window.JJ.data = { positions, categories, techniques, flows };
  window.JJ.byId = byId;
})();
