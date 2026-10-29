/*
 * Small Talk: the party's nine phases, from setting up to the smoking ruins,
 * and the little scene (the vignette) each round plays out on the front
 * wall, the same every time it loops: who's there, where they walk, what
 * they do and what they say. Plain data, so the voice tool can read it too
 * (tools/small-talk-voices.mjs makes assets/small-talk/voices.mp3 from the
 * lines and fills in VOICES at the bottom).
 *
 * Positions are [u, d] on the front wall: u metres across (left -, right +),
 * d metres out from the eye. The corridor in from the front wall is always
 * at u -3.9. A track is a list of keys:
 *   [t, u, d, act, look, opts]
 * Hold at a key until the next; when the next key is somewhere else, walk
 * there over the time between them. look: 'eye' (the camera), 'wall', the
 * name of someone else in the scene, or [u, d]. opts: { y, expr }.
 * Lines: [t, who, text]: when each starts, in seconds into the scene.
 */

// The regulars, the same at every phase of the night.
export const CAST = {
	gary: {
		name: 'GARY', voice: 'JBFqnCBsd6RMkjVDRZzb',   // George: warm, older, British
		looks: { h: 1.72, glasses: true, expr: 0, outfit: { style: 4, skin: 0xe8b896, hair: 0x9a9a98, shirt: 0xf2f2ee, legs: 0x2c2f36, tie: 0xa82a2a, jacket: 0x2c3038, sleeve: 0.74, shoes: 0x1c1a18 } },
	},
	linda: {
		name: 'LINDA', voice: 'Xb7hH8MSUJpSbSDYk0k2',  // Alice: brisk, British
		looks: { h: 1.66, glasses: true, expr: 15, outfit: { style: 3, skin: 0xf1c9a5, hair: 0x7a2e1e, shirt: 0xf0c4cc, legs: 0x23304a, jacket: 0x2f7a78, sleeve: 0.74, skirt: true, shoes: 0x3a2418 } },
	},
	dave: {
		name: 'DAVE', voice: 'IKne3meq5aSn9XLyUdCD',   // Charlie: loud, Australian
		looks: { h: 1.84, glasses: false, expr: 1, outfit: { style: 1, skin: 0xe0ac85, hair: 0x5c3d24, shirt: 0xe88a5a, legs: 0xa89a78, tie: 0xd0a020, sleeve: 0.36, shoes: 0x3a2418 } },
	},
	priya: {
		name: 'PRIYA', voice: 'pFZP5JQG7iQjIQuC4Bku',  // Lily: warm, British
		looks: { h: 1.63, glasses: false, expr: 0, outfit: { style: 2, skin: 0x9c6a45, hair: 0x1d1814, shirt: 0xd2c8ea, legs: 0x1b1b1d, sleeve: 0.74, skirt: true, shoes: 0x1c1a18 } },
	},
	caterer: {
		name: 'CATERER', voice: 'onwK4e9ZLuTAKqWW03F9', // Daniel: flat, deadpan
		looks: { h: 1.78, glasses: false, expr: 3, outfit: { style: 1, skin: 0xc68c62, hair: 0x1d1814, shirt: 0xf2f2ee, legs: 0x1b1b1d, tie: 0x1b1b1d, jacket: 0x1b1b1d, sleeve: 0.74, shoes: 0x1c1a18 } },
	},
};

const DOOR = [-3.9, 8.6];   // just inside the corridor

export const PHASES = [
	{
		id: 'setup', clock: '6:00 PM', title: 'SETTING UP', length: 12,
		cast: {
			dave: [[0, 2.4, 6.6, 'hang', 'wall', { y: 0.62 }], [5, 2.4, 6.6, 'hang', 'linda', { y: 0.62 }], [6.5, 2.4, 6.6, 'hang', 'wall', { y: 0.62 }]],
			linda: [[0, 0.4, 4.6, 'point', 'dave'], [6.8, 0.4, 4.6, 'talk', 'caterer'], [11, 0.4, 4.6, 'point', 'dave']],
			caterer: [[0, ...DOOR, 'carry', 'eye'], [3.5, ...DOOR, 'carry', 'eye'], [6.6, -1.4, 5.0, 'carry', 'linda'], [10.5, -1.4, 5.0, 'reach', [-1.5, 5.7]]],
		},
		lines: [
			[0.6, 'linda', 'Left a bit, Dave.'],
			[2.2, 'dave', 'Your left or my left?'],
			[4.3, 'linda', "Gary's left. It's Gary's party."],
			[6.9, 'caterer', 'Where do you want the sausage rolls?'],
			[9.3, 'linda', "Somewhere Gary can't reach them."],
		],
	},
	{
		id: 'arrivals', clock: '7:00 PM', title: 'THE GUESTS ARRIVE', length: 13,
		cast: {
			gary: [[0, ...DOOR, 'idle', 'eye'], [0.2, ...DOOR, 'idle', 'eye'], [4, -1.2, 4.9, 'idle', 'priya'], [7.6, -1.2, 4.9, 'idle', 'dave'], [8.4, -1.2, 4.9, 'shake', 'dave'], [11.6, -1.2, 4.9, 'idle', 'dave']],
			priya: [[0, 1.2, 4.4, 'wave', 'gary'], [2.6, 1.2, 4.4, 'idle', 'gary'], [4.4, -0.3, 4.4, 'idle', 'gary']],
			dave: [[0, 2.6, 5.6, 'drink', 'eye'], [5.4, 2.6, 5.6, 'idle', 'gary'], [7.8, -0.5, 5.4, 'shake', 'gary'], [11.6, -0.5, 5.4, 'laugh', 'gary']],
		},
		lines: [
			[1.0, 'priya', 'Gary! You came!'],
			[3.8, 'gary', 'Well. It is my party.'],
			[5.9, 'dave', 'Thirty years, mate! Thirty years!'],
			[8.9, 'gary', 'Thirty-one, actually.'],
			[10.6, 'dave', 'Thirty-one!'],
		],
	},
	{
		id: 'mingling', clock: '7:45 PM', title: 'SMALL TALK', length: 13,
		cast: {
			dave: [[0, 0.2, 4.6, 'talk', 'priya'], [3.4, 0.2, 4.6, 'laugh', 'priya']],
			priya: [[0, -0.6, 5.3, 'drink', 'dave'], [3.2, -0.6, 5.3, 'laugh', 'dave'], [5.5, -0.6, 5.3, 'drink', 'dave']],
			gary: [[0, 0.7, 5.5, 'idle', 'dave'], [5.2, 0.7, 5.5, 'idle', 'linda'], [8.2, 0.7, 5.5, 'drink', 'linda']],
			linda: [[0, -1.6, 6.0, 'drink', 'gary'], [1.6, -1.6, 6.0, 'drink', 'gary'], [5.0, 0.9, 6.3, 'shake', 'gary'], [7.6, 0.9, 6.3, 'talk', 'gary']],
		},
		lines: [
			[0.5, 'dave', "So I said, that's not a stapler, that's my lunch!"],
			[3.6, 'priya', "Dave, that's awful."],
			[5.6, 'linda', 'Gary? Punch?'],
			[7.3, 'gary', "Just a small one. I'm driving."],
			[9.8, 'linda', "You're retired, Gary. Live a little."],
		],
	},
	{
		id: 'buffet', clock: '8:30 PM', title: 'THE BUFFET', length: 12,
		cast: {
			priya: [[0, -0.6, 5.2, 'eat', 'caterer']],
			caterer: [[0, 0.4, 6.0, 'idle', 'priya'], [2.4, 0.4, 6.0, 'talk', 'priya'], [4.4, 0.4, 6.0, 'idle', 'eye']],
			gary: [[0, 1.6, 5.2, 'idle', [1.3, 6.4]], [2.8, 1.6, 5.2, 'reach', [1.3, 6.4]], [4.4, 1.6, 5.2, 'eat', 'dave']],
			dave: [[0, 2.8, 4.6, 'eat', 'gary'], [9.4, 2.8, 4.6, 'talk', 'gary']],
		},
		lines: [
			[0.8, 'priya', 'These are lovely. Who made them?'],
			[3.0, 'caterer', 'Me. Obviously.'],
			[5.2, 'dave', 'Gary. Was that the last sausage roll?'],
			[8.1, 'gary', '... No.'],
			[9.8, 'dave', 'Gary!'],
		],
	},
	{
		id: 'speeches', clock: '9:15 PM', title: 'THE SPEECHES', length: 14,
		clap: [11.6, 13.8],
		cast: {
			linda: [[0, 2.6, 5.85, 'speech', 'eye'], [7.2, 2.6, 5.85, 'idle', 'gary'], [11.4, 2.6, 5.85, 'clap', 'eye']],
			gary: [[0, 0.6, 5.6, 'idle', 'eye'], [7.4, 0.6, 5.6, 'speech', 'eye'], [10.9, 0.6, 5.6, 'idle', 'dave']],
			dave: [[0, -1.4, 4.4, 'drink', 'linda'], [10.6, -1.4, 4.4, 'clap', 'gary']],
			priya: [[0, -0.4, 4.0, 'idle', 'linda'], [7.4, -0.4, 4.0, 'idle', 'gary'], [11.4, -0.4, 4.0, 'clap', 'gary']],
		},
		lines: [
			[0.4, 'linda', "Can I have everyone's attention? Everyone?"],
			[3.6, 'linda', "Thirty-one years. Gary, we'll miss you. Mostly."],
			[7.6, 'gary', "Thank you. I'd just like to say a few words about the filing system..."],
			[11.4, 'dave', 'Speech over! Cake!'],
		],
	},
	{
		id: 'dancing', clock: '10:30 PM', title: 'THE DANCING', length: 12,
		cast: {
			priya: [[0, -0.2, 4.6, 'dance', 'gary'], [2.6, -0.2, 4.6, 'dance', 'gary']],
			gary: [[0, 0.8, 5.4, 'idle', 'priya'], [9.4, 0.8, 5.4, 'dance', 'priya']],
			dave: [[0, 1.9, 4.4, 'dance', 'eye'], [5.0, 1.9, 4.4, 'dance', 'gary']],
		},
		lines: [
			[0.8, 'priya', "Come on, Gary, it's your night!"],
			[3.4, 'gary', 'My knees, Priya. My knees.'],
			[5.6, 'dave', 'Woooo! Gary! Gary! Gary!'],
			[8.4, 'gary', 'Oh, go on then.'],
		],
	},
	{
		id: 'drunk', clock: '11:45 PM', title: 'ONE MORE DRINK', length: 12,
		cast: {
			dave: [[0, 1.2, 5.0, 'dance', 'eye', { y: 0.77 }]],
			gary: [[0, -0.4, 4.6, 'sit-eat', 'dave']],
			linda: [[0, -1.5, 5.15, 'sit-sway', 'eye']],
			priya: [[0, 2.8, 4.4, 'sway', 'dave'], [7.4, 2.8, 4.4, 'sway', [2.0, 3.6]]],
		},
		lines: [
			[0.5, 'dave', 'I love you, Gary! I love ALL of you!'],
			[3.6, 'gary', 'Dave. Get down from there.'],
			[5.7, 'linda', 'Nobody... touches... the cake.'],
			[8.2, 'priya', 'Has anyone seen my shoe?'],
			[10.2, 'dave', "I'm fine!"],
		],
	},
	{
		id: 'fire', clock: '12:30 AM', title: 'SOMETHING IS BURNING', length: 12,
		cast: {
			caterer: [[0, 2.8, 5.6, 'idle', [-1.5, 5.7]], [1.6, 2.8, 5.6, 'idle', 'eye']],
			linda: [[0, -0.4, 4.4, 'panic', 'eye']],
			dave: [[0, 1.0, 4.2, 'spray', 'eye'], [4.0, 1.0, 4.2, 'spray', [-1.5, 5.7]], [6.0, 1.0, 4.2, 'spray', 'eye']],
			priya: [[0, -2.4, 5.2, 'panic', 'gary'], [6.6, -2.4, 5.2, 'point', 'gary']],
			gary: [[0, -1.1, 6.1, 'eat', 'eye', { fire: true }]],
		},
		lines: [
			[0.4, 'caterer', 'Fire.'],
			[1.6, 'linda', 'Everyone stay calm! STAY CALM!'],
			[4.4, 'dave', "I've got it! I've got it!"],
			[7.0, 'priya', 'Gary! Your jacket!'],
			[9.2, 'gary', 'Oh. That is warm.'],
		],
	},
	{
		id: 'aftermath', clock: '2:00 AM', title: 'THE MORNING AFTER', length: 13,
		cast: {
			gary: [[0, 0.2, 4.9, 'sit-eat', 'eye']],
			dave: [[0, 1.8, 4.4, 'dead', 'eye'], [6.0, 1.8, 4.4, 'dead-wave', 'eye']],
			caterer: [[0, -2.2, 5.4, 'sweep', [-1.5, 5.0]]],
		},
		lines: [
			[1.0, 'gary', 'Well.'],
			[3.2, 'gary', 'Best leaving do ever.'],
			[6.3, 'dave', 'Same time next year?'],
			[9.0, 'caterer', "I'll need the plates back."],
		],
	},
];

// Where each line sits in assets/small-talk/voices.mp3: [offset, seconds],
// by '<phase>-<line>'. Written by tools/small-talk-voices.mjs.
// VOICES-BEGIN
export const VOICES = {
	'0-0': [0, 0.969],
	'0-1': [1.219, 1.014],
	'0-2': [2.483, 2.038],
	'0-3': [4.771, 1.958],
	'0-4': [6.979, 1.76],
	'1-0': [8.988, 0.92],
	'1-1': [10.158, 1.321],
	'1-2': [11.729, 1.809],
	'1-3': [13.788, 1.171],
	'1-4': [15.209, 0.565],
	'2-0': [16.024, 2.883],
	'2-1': [19.157, 1.219],
	'2-2': [20.626, 0.888],
	'2-3': [21.764, 1.823],
	'2-4': [23.837, 2.158],
	'3-0': [26.245, 1.51],
	'3-1': [28.005, 1.234],
	'3-2': [29.489, 2.193],
	'3-3': [31.932, 0.72],
	'3-4': [32.903, 0.452],
	'4-0': [33.604, 2.559],
	'4-1': [36.414, 3.05],
	'4-2': [39.713, 4.016],
	'4-3': [43.979, 1.258],
	'5-0': [45.487, 1.539],
	'5-1': [47.276, 1.764],
	'5-2': [49.289, 1.806],
	'5-3': [51.345, 0.782],
	'6-0': [52.377, 1.784],
	'6-1': [54.411, 1.471],
	'6-2': [56.131, 2.248],
	'6-3': [58.63, 1.134],
	'6-4': [60.013, 0.622],
	'7-0': [60.885, 0.512],
	'7-1': [61.647, 2.138],
	'7-2': [64.035, 1.201],
	'7-3': [65.485, 1.05],
	'7-4': [66.785, 1.118],
	'8-0': [68.153, 0.418],
	'8-1': [68.821, 1.338],
	'8-2': [70.409, 1.074],
	'8-3': [71.732, 1.005],
};
// VOICES-END

// Where each phase's radio music sits in assets/small-talk/radio.mp3: [offset, seconds].
// Written by tools/small-talk-radio.mjs.
// RADIO-BEGIN
export const RADIO = [
	[0, 30.041],   // 0
	[30.041, 30.041],   // 1
	[60.082, 30.041],   // 2
	[90.122, 30.041],   // 3
	[120.163, 30.041],   // 4
	[150.204, 30.041],   // 5
	[180.245, 30.041],   // 6
	[210.286, 30.041],   // 7
	[240.327, 29.989],   // 8
];
// RADIO-END
