export type RenderBadgeOptions = {
    clocJson: object;
    title?: string;
    fontPath?: string;
    mascotPath?: string;
};
/**
 * Render a complete, self-contained LOChy badge card.
 *
 * The card is sized from the measured text (using the loaded font once) and
 * from the mascot's aspect ratio, so longer titles and extra language rows grow
 * the SVG instead of clipping.
 */
export declare function renderBadge(opts: RenderBadgeOptions): Promise<string>;
//# sourceMappingURL=render.d.ts.map