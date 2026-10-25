/*
 * Hack Arizona mark: measured geometry.
 * Every number below was measured from "Hack Arizona Logo (Circle).png" (1184 x 1172) and
 * shifted into a 1200 x 1200 viewBox centred on the mark. The traced SVG matches the PNG
 * with a mean channel difference of 1.1 / 255 and a white-area IoU of 0.991.
 * Units: viewBox pixels, y pointing down (SVG convention).
 */

export const VIEWBOX = 1200;

export const OUTER_RING = { cx: 600, cy: 600, r: 588.6 };
export const DISC = { cx: 600, cy: 600.3, r: 527.05 };

// Vertical linear gradient of the disc, sampled from the PNG.
export const GRADIENT = { y1: 318.7, y2: 884.7, top: '#AA1F23', bottom: '#15244A' };

// Stroke widths of the traces.
export const TRUNK_WIDTH = 112;
export const ARM_WIDTH = 108;

// Ring pads: centre-line radius and band width (outer radius 108.2, hole radius 50.7).
export const PAD_RADIUS = 79.4;
export const PAD_BAND = 57.5;

export const TRUNK_X = 592.8;
export const TRUNK_BASE_Y = 1127;

export const PADS =
{
    top: { cx: 592.8, cy: 282.4, attach: [592.8, 361.8] },
    left: { cx: 334.0, cy: 488.4, attach: [359.9, 563.4] },
    right: { cx: 865.9, cy: 673.2, attach: [837.6, 747.4] }
};

// Arm centre lines: a cubic Bezier from the trunk, then a short straight run into the pad.
// Fitted to the skeleton of the traced shape (rms error 0.8 px left, 1.5 px right).
export const ARMS =
{
    left:
    {
        bezier: [[592.8, 699.2], [494.1, 699.2], [396.1, 689.1], [370.7, 594.7]],
        pad: 'left'
    },
    right:
    {
        bezier: [[592.8, 886.5], [696.9, 886.5], [805.8, 852.7], [825.7, 778.7]],
        pad: 'right'
    }
};
