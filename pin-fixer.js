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

    static get onNotesLayer() {
        return canvas.activeLayer?.constructor?.name == "NotesLayer";
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
     * Handles the updateNote Hook
     *
     * Updates names that should be shown and notes that need hidden.
     *
     * @static
     * @param {*} args
     * @memberof PinFixer
     */
    static updateNote(...args) {
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
}

/**
 * This is the Hooks section, hooks are registered here to call methods
 * of PinFixer with all arguments.
 */

Hooks.once("ready", () => {
    Hooks.on("renderSceneControls", (...args) => PinFixer.renderSceneControls(...args));
});

Hooks.on("canvasPan", (...args) => PinFixer.canvasPan(...args));

Hooks.on("updateNote", (...args) => PinFixer.updateNote(...args));
