/*
 * THE DATA — every position, category and technique, and how they connect.
 *
 * Think of this file as the parts list for the whole machine. The graph code
 * only reads from here, so to add a move you just add one line below.
 *
 * Three levels, like zooming in on a map:
 *   positions  (countries)  -> e.g. "Mount"
 *   categories (cities)     -> e.g. "Submissions"
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
    { id: 'front-headlock', name: 'Front Headlock', x: -1350, y: 250, color: '#9a8c98',
      blurb: 'Top player is in front of a bent-over or turtled opponent, controlling their head and an arm. A crossroads for chokes and go-behinds, huge in no-gi and wrestling.' },
    { id: 'north-south', name: 'North-South', x: -700, y: 5350, color: '#84a59d',
      blurb: 'Top player lies chest to chest but facing the opposite way, like two people lying head to toe. Heavy, and great for chokes and kimuras.' },
    { id: 'scarf-hold', name: 'Scarf Hold', x: 700, y: 5350, color: '#cdb4db',
      blurb: 'Top player sits beside the bottom player, hugging their head and trapping an arm, like a seatbelt across the chest. A judo pin (kesa gatame): very heavy, but it leaves your back exposed.' },
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
    { from: 'standing', to: 'front-headlock', label: 'snap down' },
    { from: 'takedowns', to: 'front-headlock', label: 'sprawl' },
    { from: 'front-headlock', to: 'back-control', label: 'go-behind' },
    { from: 'front-headlock', to: 'turtle', label: 'they turtle' },
    { from: 'side-control', to: 'north-south', label: 'walk around' },
    { from: 'north-south', to: 'half-guard', label: 'escape' },
    { from: 'side-control', to: 'scarf-hold', label: 'switch hips' },
    { from: 'scarf-hold', to: 'mount', label: 'transition' },
    { from: 'scarf-hold', to: 'back-control', label: 'escape' },
  ];

  // ---------------------------------------------------------------------------
  // CATEGORIES — the middle zoom level. Each one lives inside a position.
  // Grouped by what the move DOES. Whether you're on top or bottom is
  // tagged on each technique instead.
  // ---------------------------------------------------------------------------
  const categories = [
    { id: 'st-grips', name: 'Grips & Ties', position: 'standing' },
    { id: 'st-pulls', name: 'Guard Pulls', position: 'standing' },

    { id: 'td-wrestling', name: 'Wrestling', position: 'takedowns' },
    { id: 'td-judo', name: 'Judo Throws', position: 'takedowns' },
    { id: 'td-defense', name: 'Takedown Defense', position: 'takedowns' },

    { id: 'cg-sweeps', name: 'Sweeps', position: 'closed-guard' },
    { id: 'cg-subs', name: 'Submissions', position: 'closed-guard' },
    { id: 'cg-back', name: 'Back Takes', position: 'closed-guard' },
    { id: 'cg-breaks', name: 'Guard Breaks', position: 'closed-guard' },

    { id: 'og-guards', name: 'Guard Types', position: 'open-guard' },
    { id: 'og-sweeps', name: 'Sweeps', position: 'open-guard' },
    { id: 'og-leglocks', name: 'Leg Locks', position: 'open-guard' },
    { id: 'og-pass', name: 'Guard Passing', position: 'open-guard' },

    { id: 'hg-sweeps', name: 'Frames & Sweeps', position: 'half-guard' },
    { id: 'hg-pass', name: 'Passing', position: 'half-guard' },

    { id: 'tu-attacks', name: 'Attacks & Back Takes', position: 'turtle' },
    { id: 'tu-escapes', name: 'Escapes', position: 'turtle' },

    { id: 'sc-subs', name: 'Submissions', position: 'side-control' },
    { id: 'sc-trans', name: 'Transitions', position: 'side-control' },
    { id: 'sc-escapes', name: 'Escapes', position: 'side-control' },

    { id: 'kob-subs', name: 'Submissions', position: 'knee-on-belly' },
    { id: 'kob-trans', name: 'Transitions', position: 'knee-on-belly' },
    { id: 'kob-escapes', name: 'Escapes', position: 'knee-on-belly' },

    { id: 'bc-control', name: 'Control', position: 'back-control' },
    { id: 'bc-subs', name: 'Submissions', position: 'back-control' },
    { id: 'bc-escapes', name: 'Escapes', position: 'back-control' },

    { id: 'mt-subs', name: 'Submissions', position: 'mount' },
    { id: 'mt-trans', name: 'Transitions', position: 'mount' },
    { id: 'mt-escapes', name: 'Escapes', position: 'mount' },

    { id: 'fh-control', name: 'Control & Go-Behinds', position: 'front-headlock' },
    { id: 'fh-subs', name: 'Submissions', position: 'front-headlock' },
    { id: 'fh-escapes', name: 'Escapes', position: 'front-headlock' },

    { id: 'ns-subs', name: 'Submissions', position: 'north-south' },
    { id: 'ns-escapes', name: 'Escapes', position: 'north-south' },

    { id: 'kesa-control', name: 'Control', position: 'scarf-hold' },
    { id: 'kesa-subs', name: 'Submissions', position: 'scarf-hold' },
    { id: 'kesa-escapes', name: 'Escapes', position: 'scarf-hold' },
  ];

  // ---------------------------------------------------------------------------
  // TECHNIQUES — the individual moves.
  //
  // t(id, name, category, style, role, description, success, fail, related)
  //   style:   'both' | 'gi' | 'nogi'
  //   role:    'top' | 'bottom' | 'neutral' (neutral = both standing)
  //   success: where to go if the move works
  //   fail:    what to try if it doesn't
  //   related: other moves worth knowing
  //
  // A move can be done from more than one place (e.g. Armbar from guard AND
  // from mount). t() sets up its first place; `also(...)` further down adds
  // more. Each place has its own top/bottom and its own links, but the move
  // itself (name, description, notes, video) is shared — one move, many places.
  // ---------------------------------------------------------------------------
  const t = (id, name, category, style, role, desc, success = [], fail = [], related = []) => ({
    id, name, desc,
    gi: style !== 'nogi',
    nogi: style !== 'gi',
    places: [{ category, role, success, fail, related }],
  });

  const techniques = [
    // ---- Standing: Grips & Ties ----
    t('collar-tie', 'Collar Tie', 'st-grips', 'both', 'neutral',
      'Hand behind their neck, elbow pressed into their collarbone like a lever. You can pull their head down and feel which way they are moving.',
      ['single-leg', 'double-leg', 'snap-down'], ['underhook-pummel'], ['two-on-one']),
    t('underhook-pummel', 'Underhook Pummel', 'st-grips', 'both', 'neutral',
      'Swim your arm under their armpit and lift. An underhook is like a jack under their shoulder: it tilts them up and makes their legs light.',
      ['osoto-gari', 'single-leg'], ['collar-tie'], ['two-on-one']),
    t('two-on-one', 'Two-on-One (Russian Tie)', 'st-grips', 'both', 'neutral',
      'Both your hands on one of their arms. Two hands beat one, so you control that whole side of their body.',
      ['arm-drag-standing', 'single-leg'], ['collar-tie'], ['arm-drag-guard']),
    t('collar-sleeve', 'Collar & Sleeve Grip', 'st-grips', 'gi', 'neutral',
      'One hand on their lapel, the other on their sleeve at the wrist. Like the handlebars of a bike: you steer their upper body.',
      ['osoto-gari', 'seoi-nage', 'pull-closed-guard'], [], ['scissor-sweep']),
    t('snap-down', 'Snap Down', 'st-grips', 'both', 'neutral',
      'From a collar tie, yank their head down sharply so their hands hit the mat. Their weight falls forward onto you.',
      ['front-headlock-control', 'guillotine', 'turtle', 'ankle-pick'], ['collar-tie'], ['sprawl']),

    // ---- Standing: Guard Pulls ----
    t('pull-closed-guard', 'Pull Closed Guard', 'st-pulls', 'both', 'neutral',
      'Get a grip, sit or jump, and wrap your legs around their waist with ankles locked. You choose to fight from your back.',
      ['closed-guard'], ['open-guard'], ['collar-sleeve']),
    t('sit-to-butterfly', 'Sit to Butterfly Guard', 'st-pulls', 'both', 'neutral',
      'Sit down in front of them and slide both feet in as hooks between their thighs.',
      ['butterfly-guard'], ['half-guard'], ['butterfly-sweep']),

    // ---- Takedowns: Wrestling ----
    t('double-leg', 'Double Leg', 'td-wrestling', 'both', 'neutral',
      'Drop your hips (change levels), step deep between their feet, wrap both legs and drive through them like pushing a stalled car. Head on the outside.',
      ['side-control', 'half-guard'], ['single-leg', 'sprawl'], ['single-leg']),
    t('single-leg', 'Single Leg', 'td-wrestling', 'both', 'neutral',
      'Grab one leg and hug it to your chest. Lift and turn, or "run the pipe" (drive at an angle) to knock them over.',
      ['side-control', 'half-guard'], ['double-leg', 'turtle'], ['ankle-pick']),
    t('ankle-pick', 'Ankle Pick', 'td-wrestling', 'both', 'neutral',
      'Snap their head down so their weight shifts onto their front foot, then pick up that ankle. Like kicking out a table leg while someone leans on it.',
      ['side-control'], ['single-leg'], ['snap-down', 'collar-tie']),
    t('arm-drag-standing', 'Arm Drag to Back', 'td-wrestling', 'both', 'neutral',
      'Pull their arm across your body and past you, like yanking a door open, then step behind them.',
      ['back-control', 'double-leg'], ['two-on-one'], ['arm-drag-guard']),

    // ---- Takedowns: Judo ----
    t('osoto-gari', 'Osoto Gari (Major Outer Reap)', 'td-judo', 'both', 'neutral',
      'Tip their weight back onto one heel, then reap that leg out from behind with yours. Like kicking the last leg out from under a tilted chair.',
      ['side-control'], ['double-leg'], ['collar-sleeve', 'underhook-pummel']),
    t('seoi-nage', 'Seoi Nage (Shoulder Throw)', 'td-judo', 'gi', 'neutral',
      'Turn in under them, load them onto your back, and bend forward. Your hips are the pivot of a lever that pitches them over your shoulder.',
      ['side-control'], ['osoto-gari'], ['collar-sleeve', 'uchi-mata']),
    t('uchi-mata', 'Uchi Mata (Inner Thigh Throw)', 'td-judo', 'gi', 'neutral',
      'Pull them forward onto their toes, then swing your leg up between theirs to lift them over, like a pendulum.',
      ['side-control'], ['seoi-nage'], ['osoto-gari']),

    // ---- Takedowns: Defense ----
    t('sprawl', 'Sprawl', 'td-defense', 'both', 'neutral',
      'Shoot your legs back and drop your hips onto their head and shoulders. You become a heavy wedge they can\'t drive through.',
      ['front-headlock-control', 'guillotine', 'turtle'], ['pull-closed-guard'], ['snap-down', 'whizzer']),
    t('guillotine', 'Guillotine', 'td-defense', 'both', 'neutral',
      'Wrap your arm around their neck from the front, forearm blade under the chin, and clasp your hands. Standing, pull up and push your hips forward; from guard, close your legs and arch.',
      [], ['pull-closed-guard'], []),

    // ---- Closed Guard: Sweeps ----
    t('scissor-sweep', 'Scissor Sweep', 'cg-sweeps', 'both', 'bottom',
      'Shin across their belly, bottom leg chops behind their knee. Pull their upper body in as your legs scissor, like knocking over a sawhorse.',
      ['mount'], ['hip-bump-sweep', 'flower-sweep'], ['collar-sleeve']),
    t('hip-bump-sweep', 'Hip Bump Sweep', 'cg-sweeps', 'both', 'bottom',
      'When they sit up tall, sit up too, post a hand behind you, and bump your hip into them to roll them over.',
      ['mount'], ['kimura', 'guillotine'], ['scissor-sweep']),
    t('flower-sweep', 'Flower (Pendulum) Sweep', 'cg-sweeps', 'both', 'bottom',
      'Trap an arm and grab the far leg. Swing your leg like a pendulum to lift them and roll them toward the trapped arm, so they can\'t post.',
      ['mount'], ['armbar'], ['scissor-sweep']),

    // ---- Closed Guard: Submissions ----
    t('armbar', 'Armbar', 'cg-subs', 'both', 'bottom',
      'Isolate one arm, pin their shoulder and head with your legs, and lift your hips into their elbow. The elbow is a hinge; your hips bend it the wrong way.',
      [], ['triangle', 'omoplata', 'flower-sweep'], ['armbar-back', 'far-side-armbar']),
    t('triangle', 'Triangle Choke', 'cg-subs', 'both', 'bottom',
      'One of their arms in, one out. Lock your legs in a figure-four around their neck and the trapped arm. Their own shoulder squeezes one side of their neck.',
      [], ['armbar', 'omoplata'], ['spider-guard']),
    t('omoplata', 'Omoplata', 'cg-subs', 'both', 'bottom',
      'Swing your leg over their shoulder and turn to face their feet. Your legs crank their shoulder like turning a wrench. Often turns into a sweep.',
      ['side-control'], ['triangle'], ['lasso-guard']),
    t('kimura', 'Kimura', 'cg-subs', 'both', 'bottom',
      'Grab their wrist, reach around their arm and grab your own wrist (a figure-four), then rotate their hand up behind their back like cranking a handle.',
      [], ['hip-bump-sweep', 'guillotine'], ['americana']),
    t('cross-collar', 'Cross Collar Choke', 'cg-subs', 'gi', 'bottom',
      'Deep grip in one side of their collar, other hand crosses to the other side. Pull your elbows apart and down, like wringing out a towel.',
      [], ['armbar'], ['bow-arrow']),

    // ---- Closed Guard: Back Takes ----
    t('arm-drag-guard', 'Arm Drag', 'cg-back', 'both', 'bottom',
      'Drag their arm across your body, sit up to their side, and climb onto their back.',
      ['back-control'], ['hip-bump-sweep'], ['arm-drag-standing', 'two-on-one']),

    // ---- Closed Guard: Guard Breaks (Top) ----
    t('posture', 'Posture Up', 'cg-breaks', 'both', 'top',
      'Straight spine, head up, hands on their hips or belly. A straight post is hard to bend. Everything in top closed guard starts here.',
      ['standing-guard-break', 'kneeling-guard-break'], [], []),
    t('standing-guard-break', 'Standing Guard Break', 'cg-breaks', 'both', 'top',
      'From good posture, stand up one leg at a time. Gravity pulls their legs down and apart, then you push a knee to open the lock.',
      ['open-guard', 'toreando'], ['posture'], ['kneeling-guard-break']),
    t('kneeling-guard-break', 'Kneeling Guard Break', 'cg-breaks', 'both', 'top',
      'Knee in their tailbone, the other leg back. Push their hip down to pry the ankles open, like opening a stiff clamp.',
      ['open-guard', 'knee-slice'], ['standing-guard-break'], ['posture']),

    // ---- Open Guard: Guard Types ----
    t('butterfly-guard', 'Butterfly Guard', 'og-guards', 'both', 'bottom',
      'Sit up with both feet hooked inside their thighs. Your hooks are like the forks of a forklift under their legs.',
      ['butterfly-sweep', 'single-leg-x'], ['half-guard'], ['sit-to-butterfly']),
    t('de-la-riva', 'De La Riva Guard', 'og-guards', 'both', 'bottom',
      'One leg hooks around the outside of their front leg from behind, and you grab that ankle. You hang on their leg like a hook on a pole.',
      ['x-guard', 'tripod-sweep'], ['half-guard'], ['spider-guard']),
    t('spider-guard', 'Spider Guard', 'og-guards', 'gi', 'bottom',
      'Grip both sleeves and press your feet into their biceps. Your legs are pistons pushing their arms away.',
      ['triangle', 'omoplata'], ['lasso-guard'], ['de-la-riva']),
    t('lasso-guard', 'Lasso Guard', 'og-guards', 'gi', 'bottom',
      'Wrap your leg around the outside of their arm and over it while gripping the sleeve. Their arm is stuck in a coil of rope.',
      ['omoplata', 'triangle'], ['spider-guard'], []),
    t('x-guard', 'X-Guard', 'og-guards', 'both', 'bottom',
      'Get under them with your legs crossed in an X around one of their legs. You lift them like a car on a jack, then tip them over.',
      ['side-control'], ['single-leg-x'], ['butterfly-guard']),
    t('single-leg-x', 'Single Leg X (Ashi Garami)', 'og-guards', 'both', 'bottom',
      'Trap one of their legs between yours with a foot on their hip. A hub for sweeps and leg locks.',
      ['straight-ankle-lock', 'heel-hook', 'side-control'], ['x-guard'], ['kneebar']),

    // ---- Open Guard: Sweeps ----
    t('butterfly-sweep', 'Butterfly (Hook) Sweep', 'og-sweeps', 'both', 'bottom',
      'Get an underhook, fall to your side, and lift with your hook like a catapult arm to toss them over.',
      ['mount', 'side-control'], ['single-leg-x', 'half-guard'], ['butterfly-guard']),
    t('tripod-sweep', 'Tripod Sweep', 'og-sweeps', 'both', 'bottom',
      'Hook behind one heel and push their other hip with your foot. A person standing is a two-legged stool; take one leg away and they tip backward.',
      ['side-control'], ['de-la-riva'], ['x-guard']),

    // ---- Open Guard: Leg Locks ----
    t('straight-ankle-lock', 'Straight Ankle Lock', 'og-leglocks', 'both', 'bottom',
      'Trap their foot in your armpit, blade your wrist under their Achilles tendon, and arch back.',
      [], ['single-leg-x', 'kneebar'], ['heel-hook']),
    t('heel-hook', 'Heel Hook', 'og-leglocks', 'nogi', 'bottom',
      'Trap the leg, cup the heel, and rotate. The knee is a hinge not built to twist, so this is dangerous: train it slowly and tap early. Banned in most gi rulesets.',
      [], ['straight-ankle-lock'], ['single-leg-x']),
    t('kneebar', 'Kneebar', 'og-leglocks', 'both', 'bottom',
      'Hug their leg, hips against the back of their knee, and extend. Like an armbar, but for the leg.',
      [], ['straight-ankle-lock'], ['armbar']),

    // ---- Open Guard: Passing (Top) ----
    t('toreando', 'Toreando Pass', 'og-pass', 'both', 'top',
      'Grip their knees or pants, throw their legs to one side like a bullfighter moving a cape, and run around to side control.',
      ['side-control', 'sc-to-kob'], ['knee-slice', 'leg-drag'], ['leg-drag']),
    t('knee-slice', 'Knee Slice (Knee Cut)', 'og-pass', 'both', 'top',
      'Drive your knee diagonally across their thigh while crossfacing, like a blade cutting through.',
      ['side-control', 'mount'], ['half-guard'], ['toreando']),
    t('leg-drag', 'Leg Drag', 'og-pass', 'both', 'top',
      'Pull their legs across your hip so their knees point away, then settle chest-to-chest.',
      ['side-control', 'back-control'], ['toreando'], ['toreando']),
    t('over-under', 'Over-Under Pass', 'og-pass', 'both', 'top',
      'One arm over a leg, one under the other. Stack their hips toward their head and walk around with heavy pressure.',
      ['side-control'], ['half-guard'], ['knee-slice']),

    // ---- Half Guard: Bottom ----
    t('knee-shield', 'Knee Shield (Z-Guard)', 'hg-sweeps', 'both', 'bottom',
      'Top knee across their chest like a wall, bottom leg traps their leg. It keeps distance so they can\'t flatten you.',
      ['underhook-dogfight', 'kimura'], ['deep-half'], []),
    t('underhook-dogfight', 'Underhook & Dogfight', 'hg-sweeps', 'both', 'bottom',
      'Get the underhook and come up onto your knees beside them. Now you are both on your knees, and you have the better angle.',
      ['old-school-sweep', 'back-control'], ['knee-shield'], ['underhook-turtle']),
    t('old-school-sweep', 'Old School Sweep', 'hg-sweeps', 'both', 'bottom',
      'From the underhook, grab their far ankle and drive into them so they fall over the leg you trapped.',
      ['side-control'], ['underhook-dogfight'], ['single-leg-turtle']),
    t('deep-half', 'Deep Half Guard', 'hg-sweeps', 'both', 'bottom',
      'Dive under them and hug their leg. You\'re under their center of gravity, like a jack under a car.',
      ['side-control'], ['knee-shield'], ['x-guard']),

    // ---- Half Guard: Top ----
    t('crossface-flatten', 'Crossface & Underhook', 'hg-pass', 'both', 'top',
      'Shoulder across their jaw turns their head away; underhook their far arm. Flat on their back, they can\'t sweep.',
      ['knee-slice', 'hg-mount-pass'], [], []),
    t('hg-mount-pass', 'Half Guard to Mount Pass', 'hg-pass', 'both', 'top',
      'Free your trapped leg by pushing their knee down with your other foot, then slide straight over into mount.',
      ['mount'], ['crossface-flatten'], ['knee-slice']),

    // ---- Turtle: Top ----
    t('turtle-seatbelt', 'Seatbelt & Roll', 'tu-attacks', 'both', 'top',
      'Seatbelt grip from behind, sink one hook, then roll them over your side to take the back.',
      ['back-control'], ['crucifix'], ['seatbelt']),
    t('clock-choke', 'Clock Choke', 'tu-attacks', 'gi', 'top',
      'Feed their collar, sprawl your hips back and walk around their head like the hand of a clock.',
      [], ['turtle-seatbelt'], ['paper-cutter']),
    t('crucifix', 'Crucifix', 'tu-attacks', 'both', 'top',
      'Trap one arm with your legs and the other with your arm, then roll them so both arms are pinned. Chokes and armlocks follow.',
      ['armbar-back'], ['turtle-seatbelt'], []),

    // ---- Turtle: Bottom ----
    t('granby', 'Granby Roll', 'tu-escapes', 'both', 'bottom',
      'Tuck and roll across your shoulders to spin back around to guard.',
      ['open-guard', 'closed-guard'], ['sit-out'], []),
    t('sit-out', 'Sit-Out', 'tu-escapes', 'both', 'bottom',
      'Post a hand, kick a leg through underneath you, sit and turn to face them.',
      ['half-guard', 'single-leg-turtle'], ['granby'], ['technical-standup']),
    t('technical-standup', 'Technical Stand-Up', 'tu-escapes', 'both', 'bottom',
      'Post a hand and the opposite foot, lift your hips, and sweep your leg back under you to stand up safely.',
      ['standing'], ['sit-out'], []),
    t('single-leg-turtle', 'Single Leg from Knees', 'tu-escapes', 'both', 'bottom',
      'From your knees, grab a leg and come up into a single-leg finish.',
      ['side-control'], ['sit-out'], ['single-leg']),

    // ---- Side Control: Top ----
    t('americana', 'Americana', 'sc-subs', 'both', 'top',
      'Pin their wrist to the mat, figure-four their arm, then slide their hand toward their hip like a windshield wiper while lifting the elbow.',
      [], ['kimura', 'sc-to-mount'], ['kimura']),
    t('arm-triangle', 'Arm Triangle', 'sc-subs', 'both', 'top',
      'Trap their head and one arm inside your arms, drop to the side, and squeeze. Their own shoulder does the choking.',
      [], ['mount'], ['triangle']),
    t('paper-cutter', 'Paper Cutter Choke', 'sc-subs', 'gi', 'top',
      'Feed their collar, then drop your forearm across their throat like closing a paper cutter.',
      [], ['sc-to-mount'], ['clock-choke']),
    t('sc-to-mount', 'Knee Slide to Mount', 'sc-trans', 'both', 'top',
      'Slide your knee across their belly and swing into mount, keeping chest pressure on them the whole time.',
      ['mount'], ['sc-to-kob'], []),
    t('sc-to-kob', 'Switch to Knee on Belly', 'sc-trans', 'both', 'top',
      'Pop up and put your knee on their stomach, other leg posted wide.',
      ['knee-on-belly'], ['sc-to-mount'], []),

    // ---- Side Control: Bottom ----
    t('shrimp-reguard', 'Shrimp to Guard', 'sc-escapes', 'both', 'bottom',
      'Frame on their neck and hip, then shrimp (push your hips away) to make space and feed your knee back in.',
      ['closed-guard', 'half-guard'], ['underhook-turtle'], ['elbow-knee']),
    t('underhook-turtle', 'Underhook to Knees', 'sc-escapes', 'both', 'bottom',
      'Get an underhook, turn toward them onto your knees, and come up.',
      ['single-leg-turtle', 'turtle'], ['shrimp-reguard'], ['underhook-dogfight']),

    // ---- Knee on Belly: Top ----
    t('far-side-armbar', 'Far-Side Armbar', 'kob-subs', 'both', 'top',
      'When they push on your knee, step around their head and fall into an armbar on the arm they pushed with.',
      [], ['side-control'], ['armbar']),
    t('kob-to-mount', 'Knee on Belly to Mount', 'kob-trans', 'both', 'top',
      'If they turn toward you, slide your knee straight over into mount.',
      ['mount'], ['side-control'], []),
    t('baseball-bat-choke', 'Baseball Bat Choke', 'kob-subs', 'gi', 'top',
      'Both hands in their collar like gripping a bat, then spin around their head to tighten it.',
      [], ['kob-to-mount'], []),

    // ---- Knee on Belly: Bottom ----
    t('kob-escape', 'Push & Shrimp', 'kob-escapes', 'both', 'bottom',
      'Push their knee toward their butt (not up), turn in, and shrimp to recover guard.',
      ['closed-guard', 'half-guard'], ['underhook-turtle'], ['shrimp-reguard']),

    // ---- Back Control: Control ----
    t('seatbelt', 'Seatbelt & Hooks', 'bc-control', 'both', 'top',
      'One arm over their shoulder, one under their armpit, hands clasped like a seatbelt. Heels hooked inside their thighs.',
      ['rnc', 'bow-arrow'], ['body-triangle'], ['turtle-seatbelt']),
    t('body-triangle', 'Body Triangle', 'bc-control', 'both', 'top',
      'Lock your legs in a figure-four around their waist. Tighter than hooks and hard to shake off.',
      ['rnc'], ['seatbelt'], []),

    // ---- Back Control: Attacks ----
    t('rnc', 'Rear Naked Choke', 'bc-subs', 'both', 'top',
      'Choking arm around the neck with the elbow under their chin. Grab your other bicep and put that hand behind their head. Squeeze like closing scissors.',
      [], ['armbar-back', 'bow-arrow'], ['arm-triangle']),
    t('bow-arrow', 'Bow & Arrow Choke', 'bc-subs', 'gi', 'top',
      'Deep collar grip, grab their pants, and stretch them out like drawing a bow.',
      [], ['rnc'], ['cross-collar']),
    t('armbar-back', 'Armbar from Back', 'bc-subs', 'both', 'top',
      'When they fight your choking hands, trap an arm, swing your leg over their head, and fall into an armbar.',
      [], ['mount'], ['armbar']),

    // ---- Back Control: Escapes ----
    t('back-escape', 'Shoulder Walk Escape', 'bc-escapes', 'both', 'bottom',
      'Protect your neck with two hands on the choking arm. Walk your shoulders to the mat, clear their bottom hook, and turn in to face them.',
      ['half-guard'], ['granby'], []),

    // ---- Mount: Top ----
    t('ezekiel', 'Ezekiel Choke', 'mt-subs', 'both', 'top',
      'Thread one arm behind their neck and grab your own sleeve (or wrist), then drive the blade of your other hand across their throat.',
      [], ['armbar'], []),
    t('s-mount', 'S-Mount', 'mt-trans', 'both', 'top',
      'Shift your legs into an S shape with one arm trapped. A launch pad for armbars and chokes.',
      ['armbar'], ['side-control'], []),

    // ---- Mount: Bottom ----
    t('upa', 'Trap & Roll (Upa)', 'mt-escapes', 'both', 'bottom',
      'Trap one of their arms and the foot on the same side, then bridge high and roll over that shoulder. Take away their kickstand, then tip them.',
      ['closed-guard'], ['elbow-knee'], []),
    t('elbow-knee', 'Elbow-Knee Escape', 'mt-escapes', 'both', 'bottom',
      'Shrimp and wedge your elbow to your knee to push their leg down, then trap that leg to get half or full guard.',
      ['half-guard', 'closed-guard'], ['upa'], ['shrimp-reguard']),

    // =========================================================================
    // BATCH 1 (Nov 2026): escapes, passing, takedowns, front headlock,
    // North-South, scarf hold, and a first slice of blue/purple material.
    // =========================================================================

    // ---- Standing ----
    t('wrist-control', 'Wrist Control', 'st-grips', 'both', 'neutral',
      'Grab their wrists before they grab you. Whoever controls the hands steers the exchange, like holding the reins.',
      ['two-on-one', 'single-leg'], ['collar-tie'], ['grip-break']),
    t('grip-break', 'Grip Break', 'st-grips', 'gi', 'neutral',
      'Strip their collar grip by pulling their hand toward its thumb side while pushing your body away. The thumb side is the weak spot of any grip, like the gap in a clamp.',
      ['collar-sleeve'], ['pull-closed-guard'], ['wrist-control']),

    // ---- Takedowns ----
    t('body-lock-takedown', 'Body Lock Takedown', 'td-wrestling', 'both', 'neutral',
      'Lock your hands around their waist, pull their hips tight to yours, then trip a leg or sit them down. Their balance is in your arms.',
      ['side-control', 'mount'], ['single-leg'], ['double-leg', 'ouchi-gari']),
    t('kouchi-gari', 'Kouchi Gari (Minor Inner Reap)', 'td-judo', 'both', 'neutral',
      'Hook behind their heel from the inside and drive forward. Their foot is pinned, so they fall backward like a tripped stool.',
      ['side-control', 'half-guard'], ['ouchi-gari', 'double-leg'], ['de-ashi-barai']),
    t('ouchi-gari', 'Ouchi Gari (Major Inner Reap)', 'td-judo', 'both', 'neutral',
      'Reap their leg from the inside with yours while driving them back over it, like pulling a rug while you push.',
      ['side-control'], ['kouchi-gari', 'double-leg'], ['osoto-gari']),
    t('de-ashi-barai', 'De Ashi Barai (Foot Sweep)', 'td-judo', 'both', 'neutral',
      'Sweep their foot just as they step their weight onto it, like kicking a chair leg as someone sits down. Pure timing.',
      ['side-control'], ['osoto-gari'], ['kouchi-gari']),
    t('tomoe-nage', 'Tomoe Nage (Circle Throw)', 'td-judo', 'gi', 'neutral',
      'Pull them forward as you sit down under them, put a foot in their hip, and launch them over your head like a catapult.',
      ['mount'], ['pull-closed-guard'], ['seoi-nage']),
    t('whizzer', 'Whizzer', 'td-defense', 'both', 'neutral',
      'When they get an underhook or a leg, wrap your arm over theirs and drive your hip down into them. Your arm is a lever pressing them to the mat.',
      ['sprawl', 'front-headlock-control'], ['guillotine'], ['sprawl']),

    // ---- Front headlock ----
    t('front-headlock-control', 'Front Headlock Control', 'fh-control', 'both', 'top',
      'Chin strap with one hand, the other on their triceps, hips back and heavy on their head. Their head is the steering wheel.',
      ['go-behind', 'darce', 'high-elbow-guillotine'], ['sprawl'], ['snap-down']),
    t('go-behind', 'Go-Behind', 'fh-control', 'both', 'top',
      'Keep the headlock, sprawl, and circle around their shoulder to their back, like walking around a table you are leaning on.',
      ['back-control', 'turtle-seatbelt'], ['darce'], ['snap-down']),
    t('darce', "D'Arce Choke", 'fh-subs', 'both', 'top',
      'Thread your arm under their neck and through their armpit, lock a figure-four and sprawl your weight onto it. Their own arm closes the choke like a hinge.',
      [], ['anaconda', 'go-behind'], ['arm-triangle']),
    t('anaconda', 'Anaconda Choke', 'fh-subs', 'both', 'top',
      'The same arm-in grip as the D\'Arce, but you roll them over your shoulder to tighten it, like wringing a towel with your whole body.',
      [], ['darce', 'go-behind'], ['darce']),
    t('high-elbow-guillotine', 'High-Elbow Guillotine', 'fh-subs', 'both', 'top',
      'Wrap the neck, lift your choking elbow high over their back and pull your wrist into your chest. The raised elbow turns your forearm into a blade.',
      [], ['go-behind'], ['guillotine']),
    t('fh-escape', 'Head-Pull Escape', 'fh-escapes', 'both', 'bottom',
      'Fight the chin strap with both hands, pull your head out to the side, and square back up to them on your feet or knees.',
      ['standing'], ['granby', 'sit-out'], ['technical-standup']),

    // ---- North-South ----
    t('sc-to-ns', 'Walk to North-South', 'sc-trans', 'both', 'top',
      'Keep your chest on theirs and walk your legs around their head, like the hand of a clock sweeping round.',
      ['north-south'], ['sc-to-mount'], ['ns-choke']),
    t('ns-choke', 'North-South Choke', 'ns-subs', 'both', 'top',
      'Chest to chest facing their feet, wrap your arm around their neck and drop your shoulder onto it. Your lat closes on their neck like a heavy door.',
      [], ['kimura'], ['arm-triangle']),
    t('ns-escape', 'North-South Escape', 'ns-escapes', 'both', 'bottom',
      'Frame on their hips, turn into them and slide a knee in front of their hips, or bridge and turn to your knees.',
      ['half-guard', 'turtle'], ['shrimp-reguard'], ['underhook-turtle']),

    // ---- Scarf hold (kesa gatame) ----
    t('sc-to-kesa', 'Switch to Scarf Hold', 'sc-trans', 'both', 'top',
      'Swing your hips so you sit beside them facing their head, trapping their near arm under your armpit.',
      ['scarf-hold'], ['sc-to-mount'], ['kesa-hold']),
    t('kesa-hold', 'Scarf Hold (Kesa Gatame)', 'kesa-control', 'both', 'top',
      'Sit hip to ribs beside them, their near arm trapped under your armpit and your other arm round their head. Like a seatbelt across their chest.',
      ['kesa-armlock'], ['side-control'], ['side-control']),
    t('kesa-armlock', 'Armlock from Scarf Hold', 'kesa-subs', 'both', 'top',
      'Lay their trapped arm across your thigh and push their wrist down. Your leg is the fulcrum that bends the elbow straight.',
      [], ['kesa-hold'], ['armbar']),
    t('kesa-escape-bridge', 'Bridge & Roll from Scarf Hold', 'kesa-escapes', 'both', 'bottom',
      'Hug their waist, bridge into them and roll them over your body toward their head, like flipping a mattress.',
      ['side-control', 'half-guard'], ['kesa-escape-back'], ['upa']),
    t('kesa-escape-back', 'Back Take from Scarf Hold', 'kesa-escapes', 'both', 'bottom',
      'Free your trapped arm, turn onto your knees behind them, and take their back as they lean to stop you.',
      ['back-control'], ['kesa-escape-bridge'], ['kesa-escape-bridge']),

    // ---- Side control ----
    t('ghost-escape', 'Ghost Escape', 'sc-escapes', 'both', 'bottom',
      'Turn away, slip your near shoulder under them and spin out to your knees, like sliding under a fence.',
      ['turtle', 'single-leg-turtle'], ['shrimp-reguard'], ['underhook-turtle']),

    // ---- Mount ----
    t('high-mount', 'High Mount', 'mt-trans', 'both', 'top',
      'Walk your knees up into their armpits so their elbows can\'t wedge your hips. Their arms end up high, ready to be isolated.',
      ['armbar', 'mounted-triangle', 's-mount'], [], ['s-mount']),
    t('gift-wrap', 'Gift Wrap', 'mt-trans', 'both', 'top',
      'Pull one of their arms across their own neck and hold it from behind their head, like tying a ribbon. That arm is stuck and their back is open.',
      ['back-control', 'armbar'], ['high-mount'], ['s-mount']),
    t('mounted-triangle', 'Mounted Triangle', 'mt-subs', 'both', 'top',
      'From high mount, trap one arm, swing your leg over their head and lock a triangle from on top.',
      [], ['armbar'], ['triangle']),

    // ---- Back control ----
    t('back-to-mount', 'Back to Mount', 'bc-control', 'both', 'top',
      'When they turn toward you to escape, swing your leg over and settle into mount, like getting back on a bike.',
      ['mount'], ['seatbelt'], ['body-triangle']),
    t('short-choke', 'Short Choke', 'bc-subs', 'both', 'top',
      'When they hide their neck, squeeze your forearm across the front of it and drive your shoulder in. Less arm under the chin, more pressure.',
      [], ['armbar-back', 'rnc'], ['rnc']),
    t('body-triangle-escape', 'Body Triangle Escape', 'bc-escapes', 'both', 'bottom',
      'Cross your foot over their bottom ankle and pry it down, or roll toward the top leg so the lock opens, like unscrewing a clamp.',
      ['back-escape'], [], ['body-triangle']),

    // ---- Knee on belly ----
    t('kob-turn-in', 'Turn In to Single Leg', 'kob-escapes', 'both', 'bottom',
      'Turn into their knee, grab their posted leg, and come up for a single leg.',
      ['single-leg'], ['kob-escape'], ['single-leg-turtle']),

    // ---- Half guard ----
    t('smash-pass', 'Smash Pass', 'hg-pass', 'both', 'top',
      'Flatten their knees to one side, sit your hips on their legs and crossface. Like folding a lawn chair flat and sitting on it.',
      ['side-control', 'mount'], ['crossface-flatten'], ['over-under']),
    t('backstep-pass', 'Backstep Pass', 'hg-pass', 'both', 'top',
      'Swing your hips round to face their feet to free your trapped leg, like stepping backward out of a doorway.',
      ['side-control'], ['knee-slice'], ['leg-drag']),
    t('half-guard-back-take', 'Back Take from Half Guard', 'hg-sweeps', 'both', 'bottom',
      'From the dogfight, reach round their back, come out behind them and drag them down.',
      ['back-control'], ['old-school-sweep'], ['underhook-dogfight']),
    t('lockdown', 'Lockdown', 'hg-sweeps', 'both', 'bottom',
      'Triangle your legs around their trapped leg and stretch it out like a winch, so they can\'t post or pass.',
      ['old-school-sweep', 'deep-half'], ['knee-shield'], ['deep-half']),
    t('waiter-sweep', 'Waiter Sweep', 'hg-sweeps', 'both', 'bottom',
      'From deep half, lift their leg with your arm like a waiter holding up a tray, and tip them over.',
      ['side-control'], ['deep-half'], ['deep-half']),

    // ---- Open guard: passing ----
    t('stack-pass', 'Stack Pass', 'og-pass', 'both', 'top',
      'Lift their hips and fold them onto their shoulders, then walk around. Legs can\'t work when they\'re bent over their own head.',
      ['side-control'], ['over-under'], ['over-under']),
    t('headquarters', 'Headquarters Position', 'og-pass', 'both', 'top',
      'Kneel with one knee between their legs and your other foot outside, pinning their leg. The hub most passes start from.',
      ['knee-slice', 'long-step', 'smash-pass'], ['toreando'], []),
    t('long-step', 'Long Step Pass', 'og-pass', 'both', 'top',
      'From headquarters, take one big step over their leg and swing your hips out past their knees.',
      ['side-control'], ['knee-slice'], ['backstep-pass']),
    t('x-pass', 'X-Pass', 'og-pass', 'both', 'top',
      'Step your shin across theirs and cut diagonally past their knees in one motion, before their feet can catch you.',
      ['side-control'], ['toreando'], ['toreando']),
    t('body-lock-pass', 'Body Lock Pass', 'og-pass', 'both', 'top',
      'Lock your hands around their hips and press your chest down to kill their hip movement, then step over a leg.',
      ['side-control', 'mount'], ['knee-slice'], ['smash-pass']),

    // ---- Open guard: guards and sweeps ----
    t('collar-sleeve-guard', 'Collar & Sleeve Guard', 'og-guards', 'gi', 'bottom',
      'Grip their collar and sleeve, one foot on their biceps and one on their hip. You push with your legs and pull with your arms to control their posture.',
      ['tripod-sweep', 'triangle', 'omoplata'], ['spider-guard'], ['collar-sleeve']),
    t('reverse-dlr', 'Reverse De La Riva', 'og-guards', 'both', 'bottom',
      'Hook your leg inside their front leg from the other side, knee pointing in. It blocks the knee cut and opens back takes.',
      ['berimbolo', 'single-leg-x'], ['de-la-riva'], ['de-la-riva']),
    t('dlr-sweep', 'De La Riva Sweep', 'og-sweeps', 'both', 'bottom',
      'Kick their far leg away while your De La Riva hook lifts the near one. With both legs moving at once they topple backward.',
      ['side-control'], ['x-guard'], ['de-la-riva']),
    t('x-guard-sweep', 'X-Guard Sweep', 'og-sweeps', 'both', 'bottom',
      'From X-guard, straighten your legs to stretch them out, then stand up holding their leg so they fall.',
      ['side-control'], ['single-leg-x'], ['x-guard']),
    t('berimbolo', 'Berimbolo', 'og-sweeps', 'both', 'bottom',
      'From De La Riva, invert under them, spin them off balance and come up behind them, like a corkscrew turning.',
      ['back-control'], ['de-la-riva'], ['reverse-dlr']),

    // ---- Open guard: leg locks ----
    t('toe-hold', 'Toe Hold', 'og-leglocks', 'both', 'bottom',
      'Figure-four grip on their foot and twist it inward, like turning a key in a lock.',
      [], ['straight-ankle-lock'], ['kimura']),
    t('calf-slicer', 'Calf Slicer', 'og-leglocks', 'both', 'bottom',
      'Lace your shin behind their knee and pull their foot toward their butt. Your shin is a wedge forced into the knee joint.',
      [], ['kneebar'], ['kneebar']),
    t('inside-heel-hook', 'Inside Heel Hook', 'og-leglocks', 'nogi', 'bottom',
      'From an inside leg entanglement, cup the heel and turn it toward their centre line. Very dangerous to the knee: apply slowly and tap early.',
      [], ['heel-hook', 'straight-ankle-lock'], ['heel-hook']),

    // ---- Closed guard ----
    t('collar-drag', 'Collar Drag', 'cg-back', 'gi', 'bottom',
      'Pull their collar down past your head as you sit out to the side, and slip behind them like a revolving door.',
      ['back-control'], ['arm-drag-guard'], ['arm-drag-guard']),
    t('loop-choke', 'Loop Choke', 'cg-subs', 'gi', 'bottom',
      'Grip deep in their collar, slide your forearm behind their neck as they dive in, and roll to pull the loop tight like a noose.',
      [], ['collar-drag'], ['cross-collar']),
  ];

  // ---------------------------------------------------------------------------
  // EXTRA PLACES — moves that are also done from another position.
  // also(id, category, role, success, fail, related)
  // ---------------------------------------------------------------------------
  const also = (id, category, role, success = [], fail = [], related = []) =>
    ({ id, place: { category, role, success, fail, related } });

  const extraPlaces = [
    also('guillotine', 'cg-subs', 'bottom', [], ['hip-bump-sweep'], []),
    also('armbar', 'mt-subs', 'top', [], ['s-mount', 'side-control'], ['armbar-back']),
    also('kimura', 'sc-subs', 'top', [], ['americana', 'armbar'], ['americana']),
    also('cross-collar', 'mt-subs', 'top', [], ['armbar'], []),
    also('arm-triangle', 'mt-subs', 'top', [], ['side-control'], []),
    also('kimura', 'ns-subs', 'top', [], ['ns-choke'], []),
    also('knee-slice', 'hg-pass', 'top', ['side-control', 'mount'], ['hg-mount-pass'], ['crossface-flatten']),
    also('americana', 'kob-subs', 'top', [], ['far-side-armbar'], []),
    also('armbar', 'sc-subs', 'top', [], ['kimura'], []),
  ];

  // Moves that used to be separate copies, and the single move they became.
  // Used to carry over notes and old links saved before the merge.
  const renamed = {
    'armbar-guard': 'armbar', 'armbar-mount': 'armbar',
    'kimura-guard': 'kimura', 'kimura-top': 'kimura',
    'arm-triangle-mount': 'arm-triangle', 'cross-collar-mount': 'cross-collar',
    'guillotine-standing': 'guillotine', 'guillotine-guard': 'guillotine',
  };
  // …and which place each old copy was, so an old link opens the right spot.
  const renamedPlace = {
    'armbar-mount': 'mt-subs', 'kimura-top': 'sc-subs', 'arm-triangle-mount': 'mt-subs',
    'cross-collar-mount': 'mt-subs', 'guillotine-guard': 'cg-subs',
  };

  // ---------------------------------------------------------------------------
  // NICKNAMES — extra ways people write a move or position, so the training
  // journal can spot them. The full name (and any part in brackets, like
  // "Upa" in "Trap & Roll (Upa)") is spotted automatically; add slang here.
  // ---------------------------------------------------------------------------
  const aliases = {
    'rnc': ['RNC', 'rear naked', 'rear-naked'],
    'triangle': ['triangle'],
    'hip-bump-sweep': ['hip bump', 'bump sweep'],
    'upa': ['trap and roll', 'bridge and roll'],
    'de-la-riva': ['DLR', 'de la riva'],
    'single-leg-x': ['SLX', 'ashi garami', 'ashi'],
    'x-guard': ['x guard'],
    'seatbelt': ['seat belt'],
    'bow-arrow': ['bow and arrow'],
    'kneebar': ['knee bar'],
    'knee-on-belly': ['KOB', 'knee on stomach'],
    'granby': ['granby'],
    'toreando': ['torreando', 'bullfighter pass'],
    'flower-sweep': ['pendulum sweep', 'flower sweep'],
    'butterfly-sweep': ['hook sweep'],
    'technical-standup': ['technical stand up', 'technical standup'],
    'underhook-dogfight': ['dogfight', 'dog fight'],
    'elbow-knee': ['elbow knee', 'elbow escape'],
    'shrimp-reguard': ['shrimp', 'shrimping'],
    'body-triangle': ['body triangle'],
    'body-lock-pass': ['body lock pass'],
    'scarf-hold': ['kesa'],
    'north-south': ['north south', 'N/S'],
    'front-headlock': ['front headlock', 'front head lock'],
    'darce': ['darce', 'd\'arce', 'brabo'],
    'high-elbow-guillotine': ['high elbow guillotine', 'high-elbow'],
    'headquarters': ['HQ'],
    'reverse-dlr': ['RDLR', 'reverse dlr'],
    'inside-heel-hook': ['inside heel hook', 'inside heel'],
    'smash-pass': ['smash pass', 'half guard smash'],
  };

  // ---------------------------------------------------------------------------
  // BELT LEVELS — the rank at which each move is usually taught.
  // Format: 'belt stripes'  (belts: white, blue, purple, brown, black; stripes 0–4)
  //
  // DRAFT by Claude from common BJJ curricula. Gyms teach in different
  // orders, so this list is meant to be checked and corrected by a coach.
  // Every move must appear here exactly once (tools/check-data.js checks).
  // ---------------------------------------------------------------------------
  const levels = {
    // Standing
    'collar-tie': 'white 0', 'underhook-pummel': 'white 1', 'two-on-one': 'white 2',
    'collar-sleeve': 'white 0', 'snap-down': 'white 2', 'pull-closed-guard': 'white 0',
    'sit-to-butterfly': 'white 2',
    // Takedowns
    'double-leg': 'white 0', 'single-leg': 'white 1', 'ankle-pick': 'white 3',
    'arm-drag-standing': 'white 3', 'osoto-gari': 'white 1', 'seoi-nage': 'blue 0',
    'uchi-mata': 'blue 2', 'sprawl': 'white 0', 'guillotine': 'white 1',
    // Closed guard
    'scissor-sweep': 'white 0', 'hip-bump-sweep': 'white 0', 'flower-sweep': 'white 2',
    'armbar': 'white 0', 'triangle': 'white 1', 'omoplata': 'white 3', 'kimura': 'white 0',
    'cross-collar': 'white 1', 'arm-drag-guard': 'white 3', 'posture': 'white 0',
    'standing-guard-break': 'white 1', 'kneeling-guard-break': 'white 2',
    // Open guard
    'butterfly-guard': 'white 2', 'de-la-riva': 'blue 0', 'spider-guard': 'blue 0',
    'lasso-guard': 'blue 1', 'x-guard': 'blue 1', 'single-leg-x': 'blue 2',
    'butterfly-sweep': 'white 3', 'tripod-sweep': 'white 4', 'straight-ankle-lock': 'white 3',
    'heel-hook': 'purple 0', 'kneebar': 'blue 3', 'toreando': 'white 2', 'knee-slice': 'white 2',
    'leg-drag': 'blue 1', 'over-under': 'white 4',
    // Half guard
    'knee-shield': 'white 3', 'underhook-dogfight': 'white 4', 'old-school-sweep': 'blue 0',
    'deep-half': 'blue 2', 'crossface-flatten': 'white 2', 'hg-mount-pass': 'white 3',
    // Turtle
    'turtle-seatbelt': 'white 3', 'clock-choke': 'blue 1', 'crucifix': 'blue 3',
    'granby': 'blue 0', 'sit-out': 'white 4', 'technical-standup': 'white 0',
    'single-leg-turtle': 'white 4',
    // Side control
    'americana': 'white 0', 'arm-triangle': 'white 2', 'paper-cutter': 'blue 1',
    'sc-to-mount': 'white 0', 'sc-to-kob': 'white 1', 'shrimp-reguard': 'white 0',
    'underhook-turtle': 'white 1',
    // Knee on belly
    'far-side-armbar': 'white 3', 'kob-to-mount': 'white 1', 'baseball-bat-choke': 'blue 2',
    'kob-escape': 'white 1',
    // Back control
    'seatbelt': 'white 0', 'body-triangle': 'white 4', 'rnc': 'white 0', 'bow-arrow': 'white 3',
    'armbar-back': 'blue 0', 'back-escape': 'white 1',
    // Mount
    'ezekiel': 'white 3', 's-mount': 'white 2', 'upa': 'white 0', 'elbow-knee': 'white 0',

    // ---- Batch 1 ----
    'wrist-control': 'white 0', 'grip-break': 'white 1',
    'body-lock-takedown': 'white 3', 'kouchi-gari': 'white 3', 'ouchi-gari': 'white 4',
    'de-ashi-barai': 'blue 0', 'tomoe-nage': 'blue 2', 'whizzer': 'white 2',
    'front-headlock-control': 'white 2', 'go-behind': 'white 2', 'darce': 'blue 1',
    'anaconda': 'blue 2', 'high-elbow-guillotine': 'blue 1', 'fh-escape': 'white 3',
    'sc-to-ns': 'white 2', 'ns-choke': 'blue 0', 'ns-escape': 'white 2',
    'sc-to-kesa': 'white 2', 'kesa-hold': 'white 2', 'kesa-armlock': 'blue 0',
    'kesa-escape-bridge': 'white 3', 'kesa-escape-back': 'blue 1',
    'ghost-escape': 'blue 1', 'high-mount': 'white 2', 'gift-wrap': 'blue 1', 'mounted-triangle': 'blue 2',
    'back-to-mount': 'white 3', 'short-choke': 'white 4', 'body-triangle-escape': 'blue 0',
    'kob-turn-in': 'blue 0',
    'smash-pass': 'blue 0', 'backstep-pass': 'blue 2', 'half-guard-back-take': 'blue 1',
    'lockdown': 'blue 2', 'waiter-sweep': 'blue 3',
    'stack-pass': 'white 3', 'headquarters': 'blue 0', 'long-step': 'blue 1', 'x-pass': 'blue 2',
    'body-lock-pass': 'blue 1',
    'collar-sleeve-guard': 'white 4', 'reverse-dlr': 'blue 2', 'dlr-sweep': 'blue 1',
    'x-guard-sweep': 'blue 2', 'berimbolo': 'purple 0',
    'toe-hold': 'blue 2', 'calf-slicer': 'blue 3', 'inside-heel-hook': 'purple 1',
    'collar-drag': 'blue 0', 'loop-choke': 'blue 1',
  };

  // Build a lookup table: id -> object (and tag each object with its type).
  const byId = {};
  positions.forEach(p => { p.type = 'position'; byId[p.id] = p; });
  categories.forEach(c => { c.type = 'category'; byId[c.id] = c; });
  techniques.forEach(tq => { tq.type = 'technique'; byId[tq.id] = tq; });
  extraPlaces.forEach(x => byId[x.id].places.push(x.place));

  // Where a move sits: its category and position. `place` defaults to the first.
  const placeOf = (tq, category) => tq.places.find(pl => pl.category === category) || tq.places[0];
  const positionOf = place => byId[byId[place.category].position];

  // Does a move (at a given place) pass the current filters? Used by the map
  // and the panel. Standing moves ('neutral') count for both top and bottom.
  // With no place given, the move passes if ANY of its places does.
  const filter = { style: 'all', role: 'all' };
  const roleOk = pl => filter.role === 'all' || pl.role === filter.role || pl.role === 'neutral';
  const matches = (tq, place) =>
    (filter.style === 'all' || tq[filter.style]) &&
    (place ? roleOk(place) : tq.places.some(roleOk));

  window.JJ = window.JJ || {};
  window.JJ.filter = filter;
  window.JJ.matches = matches;
  window.JJ.placeOf = placeOf;
  window.JJ.positionOf = positionOf;
  window.JJ.renamed = renamed;
  window.JJ.aliases = aliases;
  window.JJ.levels = levels;
  window.JJ.renamedPlace = renamedPlace;
  window.JJ.data = { positions, categories, techniques, flows };
  window.JJ.byId = byId;
})();
