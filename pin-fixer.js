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
        return Boolean(this.flags.pinfix?.enable || this.flags["azgaar-foundry"]?.enable);
    }
    static get zoomFloor() {
        return Number((this.flags.pinfix?.zoomFloor || this.flags["azgaar-foundry"]?.zoomFloor) ?? this.minCanvScale);
    }
    static get zoomCeil() {
        return Number((this.flags.pinfix?.zoomCeil || this.flags["azgaar-foundry"]?.zoomCeil) ?? this.maxCanvScale);
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
        const flags = note.document.flags.pinfix || note.document.flags["azgaar-foundry"];
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
}

/**
 * This is the Hooks section, hooks are registered here to call methods
 * of PinFixer with all arguments.
 */

Hooks.once("ready", () => {
    Hooks.on("renderSceneControls", (...args) => PinFixer.renderSceneControls(...args));

    if (game.modules.get("pin-fixer")?.active) {
        ui.notifications.info(
            "Pin Fixer is no longer required for the Azgaar FMG module, please disable Pin Fixer as it has not been updated in over two years."
        );
    }
});

Hooks.on("canvasPan", (...args) => PinFixer.canvasPan(...args));

Hooks.on("updateNote", (...args) => PinFixer.updateNote(...args));
