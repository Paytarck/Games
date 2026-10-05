/* online.js - Firebase Realtime Database transport for Tank Battle rooms.
 *
 * Data layout (rooms/<CODE>):
 *   hostUid   - uid of the room creator (the "host" runs the simulation)
 *   status    - 'lobby' | 'playing'
 *   players/<uid> = { name, joinedAt, color }   (color = palette index)
 *   input/<uid>   = { x, y, a, f }      guest -> host  (controls)
 *   rules         = { rm, map, tme, td, sd, gt, ctf, tm }   host -> guests (lobby game rules, host-only edit)
 *   world         = { r, d }            host  -> guests (map + static data, once per round)
 *   state         = "<json string>"     host  -> guests (snapshot, ~20x / second)
 */
(function () {
    'use strict';

    const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // no 0/O/1/I to avoid mix-ups
    let db = null, auth = null, uid = null;
    let code = null, role = null, roomRef = null;
    const subs = [];

    function listen(ref, ev, fn) { ref.on(ev, fn); subs.push([ref, ev, fn]); }
    function unlistenAll() {
        subs.splice(0).forEach(([r, e, f]) => { try { r.off(e, f); } catch (_) {} });
    }

    function configured() {
        const c = window.FIREBASE_CONFIG;
        return !!(c && c.apiKey && c.databaseURL && !/PASTE|YOUR_/.test(c.apiKey + c.databaseURL));
    }
    function available() { return !!window.firebase && configured(); }

    async function init() {
        if (db && uid) return uid;
        if (!window.firebase) throw new Error('Could not load Firebase. Check your internet connection.');
        if (!configured()) throw new Error('Firebase is not set up yet. Open firebase-config.js and paste your project settings.');
        if (!firebase.apps.length) firebase.initializeApp(window.FIREBASE_CONFIG);
        auth = firebase.auth();
        db = firebase.database();
        const cred = await auth.signInAnonymously();      // reuses the saved anonymous user if there is one
        uid = (cred && cred.user ? cred.user : auth.currentUser).uid;
        return uid;
    }

    function randomCode() {
        let s = '';
        for (let i = 0; i < 5; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
        return s;
    }

    const PALETTE_SIZE = 10;

    async function createRoom(name, color) {
        await init();
        for (let tries = 0; tries < 8; tries++) {
            const c = randomCode();
            const ref = db.ref('rooms/' + c);
            const res = await ref.transaction(cur => {
                if (cur !== null) return;                  // code already taken -> abort, try another
                return {
                    hostUid: uid,
                    status: 'lobby',
                    createdAt: firebase.database.ServerValue.TIMESTAMP,
                    players: { [uid]: { name: name, joinedAt: 0, color: (color >= 0 && color < PALETTE_SIZE) ? color : 0 } }
                };
            });
            if (res.committed) {
                code = c; role = 'host'; roomRef = ref;
                ref.onDisconnect().remove();               // host drops -> room disappears
                return c;
            }
        }
        throw new Error('Could not create a room. Please try again.');
    }

    // first palette colour that nobody else in `players` uses (preferred one first)
    function freeColor(players, me, wanted) {
        const used = {};
        for (const k in players) if (k !== me && players[k] && Number.isInteger(players[k].color)) used[players[k].color] = true;
        if (wanted >= 0 && wanted < PALETTE_SIZE && !used[wanted]) return wanted;
        for (let i = 0; i < PALETTE_SIZE; i++) if (!used[i]) return i;
        return 0;
    }

    async function joinRoom(c, name, color) {
        await init();
        c = String(c || '').toUpperCase().trim();
        if (!/^[A-Z0-9]{5}$/.test(c)) throw new Error('A room code has 5 letters / numbers.');
        const ref = db.ref('rooms/' + c);
        const status = (await ref.child('status').once('value')).val();
        if (status === null) throw new Error('Room not found. Check the code and try again.');
        if (status !== 'lobby') throw new Error('That game has already started.');

        let reason = '';
        const res = await ref.child('players').transaction(cur => {
            cur = cur || {};
            if (cur[uid]) { cur[uid].name = name; cur[uid].color = freeColor(cur, uid, color); return cur; }
            if (Object.keys(cur).length >= 4) { reason = 'full'; return; }
            cur[uid] = { name: name, joinedAt: firebase.database.ServerValue.TIMESTAMP, color: freeColor(cur, uid, color) };
            return cur;
        });
        if (!res.committed) throw new Error(reason === 'full' ? 'This room is full (max 4 players).' : 'Could not join the room.');

        code = c; role = 'guest'; roomRef = ref;
        ref.child('players/' + uid).onDisconnect().remove();
        return true;
    }

    // ---- listeners ----
    function onRules(cb)    { listen(roomRef.child('rules'),   'value', s => cb(s.val())); }
    function onPlayers(cb)  { listen(roomRef.child('players'), 'value', s => cb(s.val() || {})); }
    function onRoomGone(cb) { listen(roomRef.child('hostUid'), 'value', s => { if (s.val() === null) cb(); }); }
    function onWorld(cb)    { listen(roomRef.child('world'),   'value', s => { const v = s.val(); if (v) cb(v.r, v.d); }); }
    function onState(cb)    { listen(roomRef.child('state'),   'value', s => { const v = s.val(); if (v) cb(v); }); }
    function onInput(cb) {
        const r = roomRef.child('input');
        const h = s => cb(s.key, s.val());
        listen(r, 'child_added', h);
        listen(r, 'child_changed', h);
    }

    // ---- senders ----
    function sendInput(o)        { if (roomRef && role === 'guest') roomRef.child('input/' + uid).set(o); }
    function setWorld(round, d)  { if (roomRef && role === 'host') roomRef.child('world').set({ r: round, d: d }); }
    function sendState(json)     { if (roomRef && role === 'host') roomRef.child('state').set(json); }
    // change my tank colour; fails (false) if a friend already took it
    async function setColor(color) {
        if (!roomRef || !(color >= 0 && color < PALETTE_SIZE)) return false;
        const res = await roomRef.child('players').transaction(cur => {
            if (!cur || !cur[uid]) return cur;
            for (const k in cur) if (k !== uid && cur[k] && cur[k].color === color) return;   // taken -> abort
            cur[uid].color = color;
            return cur;
        });
        return !!res.committed;
    }
    function setRules(o)         { if (roomRef && role === 'host') roomRef.child('rules').set(o); }   // host -> guests (lobby game rules)
    function lockRoom()          { if (roomRef && role === 'host') roomRef.child('status').set('playing'); }

    function leave() {
        unlistenAll();
        if (roomRef) {
            try {
                if (role === 'host') {
                    roomRef.onDisconnect().cancel();
                    roomRef.remove();
                } else {
                    const me = roomRef.child('players/' + uid);
                    me.onDisconnect().cancel();
                    me.remove();
                    roomRef.child('input/' + uid).remove();
                }
            } catch (_) {}
        }
        roomRef = null; code = null; role = null;
    }

    window.TankNet = {
        available, configured, init, createRoom, joinRoom,
        onPlayers, onRules, onRoomGone, onWorld, onState, onInput,
        sendInput, setWorld, sendState, setRules, lockRoom, setColor, leave,
        uid: () => uid, code: () => code
    };
})();