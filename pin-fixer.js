/**
 * A static class for manipulating the scale of map pins
 *
 * @class PinFixer
 */
class PinFixer {
    /** @type {object} */
    static get flags() {
        return canvas.scene.flags;
    }
    static get enabled() {
        return Boolean(this.flags.pinfix?.enable);
    }
    static get zoomFloor() {
        return Number(this.flags.pinfix?.zoomFloor ?? this.minCanvScale);
    }
    static get zoomCeil() {
        return Number(this.flags.pinfix?.zoomCeil ?? this.maxCanvScale);
    }
    static get aboveFog() {
        return Boolean(this.flags.pinfix?.aboveFog);
    }

    static get onNotesLayer() {
        return canvas.activeLayer?.constructor?.name == "NotesLayer";
    }

    /**
     * Calculates the reciprocal of a number
     *
     * @static
     * @param {number} number - The number to calculate the reciprocal of
     * @return {number} The reciprocal
     * @memberof PinFixer
     */
    static reciprocal(number) {
        return 1 / number;
    }

    /**
     * Map one range of numbers to another range,
     * then take an input number to the first range
     * and output the mapped number from the second range.
     *
     * https://rosettacode.org/wiki/Map_range#JavaScript
     *
     * @static
     * @param {[number, number]} from - The first range in which the input falls
     * @param {[number, number]} to - The range to map to, from which to draw the output
     * @param {number} s - The number in the first range to map to the second range
     * @return {number} The mapped number
     * @memberof PinFixer
     */
    static map(from, to, s) {
        return to[0] + ((s - from[0]) * (to[1] - to[0])) / (from[1] - from[0]);
    }

    /**
     * Returns true if the the zoom level is
     * outside the range specified for the note.
     *
     * @static
     * @param {Note} note - The note that might be hidden
     * @param {number} scale - The current scale of the scene
     * @return {boolean}
     * @memberof PinFixer
     */
    static shouldHide(note, scale) {
        if (!note._canView()) return true;
        const flags = note.document.flags?.pinfix;
        if (!flags || this.onNotesLayer) return false;
        return flags.minZoomLevel > scale || flags.maxZoomLevel < scale;
    }

    /**
     * Hides notes that need hidden
     *
     * @static
     * @param {number} scale - The current map scale
     * @param {boolean} unhide - If true, unhide regardless of scale
     * @memberof PinFixer
     */
    static hideNotes(scale, unhide) {
        canvas.notes.objects?.children.forEach((note) => this.hideNote(note, scale, unhide));
    }
    /**
     * Hides a note that needs hidden
     *
     * @static
     * @param {Note} note - The note that may need hidden
     * @param {number} scale - The current map scale
     * @param {boolean} unhide - If true, unhide regardless of scale
     * @memberof PinFixer
     */
    static hideNote(note, scale, unhide) {
        note.visible = unhide || !this.shouldHide(note, scale);
    }

    /**
     * Show the names of all notes that should have them shown
     *
     * @static
     * @memberof PinFixer
     */
    static showNoteNames() {
        canvas.notes.objects?.children.forEach((note) => this.showNoteName(note));
    }

    /**
     * Show the name of a note if it should be shown
     *
     * @static
     * @param {Note} note - The note to show the name of
     * @memberof PinFixer
     */
    static showNoteName(note) {
        note.tooltip.visible = this.shouldShowName(note);
    }

    /**
     * Check whether or not the name of a note should be shown
     *
     * By default, the name is shown when `note._hover` is true
     * when it is, the name should be shown regardless of this module.
     * The name should only be shown when it is false if the setting
     * flag on the note is true *and* this module is enabled on the scene.
     *
     * @static
     * @param {Note} note - The note to check the status on
     * @return {boolean} Whether or not to show the name
     * @memberof PinFixer
     */
    static shouldShowName(note) {
        const flags = note.document.flags?.pinfix;
        return (this.enabled && flags?.showName) || note._hover;
    }

    /**
     * Reset all pins to normal size,
     * and reset all HUDs, and unhide hidden notes
     *
     * @static
     * @memberof PinFixer
     */
    static reset() {
        this.scaleNotes(1);
        this.hideNotes(1, true);
        this.showNoteNames();
        this.resetHUDs();
    }

    /**
     * Handles the main init Hook
     *
     * Loads the template files
     *
     * @static
     * @param {array} args - Not really doing anything with the args, if there even are any
     * @memberof PinFixer
     */
    static init(...args) {
        loadTemplates(["modules/pin-fixer/sceneSettings.html"]);
    }

    /**
     * Handle the canvasPan Hook
     *
     * @static
     * @param {Canvas} canvas - The main canvas
     * @param {object} pan - A data object of canvas pan data
     * @param {number} pan.x - The x coordinate of the canvas after paning
     * @param {number} pan.y - The y coordinate of the canvas after paning
     * @param {number} pan.scale - The scale factor of the canvas after paning.
     * @return {void} Return early if Pin Fixer isn't enabled for the scene
     * @memberof PinFixer
     */
    static canvasPan(canvas, pan) {
        if (!this.enabled) return;
        this.hideNotes(pan.scale);
    }

    /**
     * Handles the hoverNote Hook
     *
     * Triggers showing the names of notes that are set to always
     * show thier names.
     *
     * @static
     * @param {array} args
     * @memberof PinFixer
     */
    static hoverNote(...args) {
        if (!this.enabled) return;
        this.showNoteNames(true);
    }

    /**
     * Handles the updateNote Hook
     *
     * Updates names that should be shown and notes that need hidden.
     *
     * @static
     * @param {*} args
     * @memberof PinFixer
     */
    static updateNote(...args) {
        this.showNoteNames(true);
        this.hideNotes(this.mapScale);
    }

    /**
     * Handles the updateScene Hook
     * If Pin Fixer is inabled for the scene
     * updated everything as if the canvas had paned
     *
     * Otherwise, reset everything.
     *
     * @static
     * @param {Scene} scene - The Scene object
     * @param {object} data - The data of the update
     * @param {object} options - The update options
     * @memberof PinFixer
     */
    static updateScene(scene, data, options) {
        if (!this.enabled) return this.reset();
        this.pullAboveFog();
        this.canvasPan(canvas, { scale: this.mapScale });
    }

    /**
     * Handles the renderSceneControls Hooks
     *
     * Refreshes the hidden state of the notes
     * in case they might need revealed for the
     * notes layer.
     *
     * @static
     * @param {array} args
     * @memberof PinFixer
     */
    static renderSceneControls(...args) {
        this.hideNotes(this.mapScale);
    }

    /**
     * Retrieves the current data for the note being configured.
     *
     * @static
     * @param {object} data - The data being passed to the note config template
     * @return {NoteSettings}
     * @memberof PinFixer
     */
    static getNoteTemplateData(data) {
        return (
            data.data?.flags?.pinfix || {
                minZoomLevel: this.minCanvScale,
                maxZoomLevel: this.maxCanvScale,
            }
        );
    }

    static pullAboveFog() {
        if (this.aboveFog && this.enabled) canvas.notes.zIndex = 300;
        else canvas.notes.zIndex = 60;
    }
}

/**
 * This is the Hooks section, hooks are registered here to call methods
 * of PinFixer with all arguments.
 */

Hooks.once("init", (...args) => PinFixer.init(...args));

Hooks.once("ready", () => {
    PinFixer.pullAboveFog();
    Hooks.on("renderSceneControls", (...args) => PinFixer.renderSceneControls(...args));
});

Hooks.on("canvasPan", (...args) => PinFixer.canvasPan(...args));
Hooks.on("hoverNote", (...args) => PinFixer.hoverNote(...args));

Hooks.on("updateNote", (...args) => PinFixer.updateNote(...args));
