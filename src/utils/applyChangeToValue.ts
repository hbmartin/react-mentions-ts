import mapPlainTextIndex from "./mapPlainTextIndex";
import getPlainText from "./getPlainText";
import spliceString from "./spliceString";
import type { MentionChildConfig } from "../types";

interface SelectionChange {
	selectionStartBefore?: number | "undefined";
	selectionEndBefore?: number | "undefined";
	selectionEndAfter: number;
}

const normalizeSelectionPoint = (
	value: number | "undefined" | undefined,
): number | undefined => {
	if (value === "undefined") {
		return undefined;
	}
	return value;
};

const ensureNumber = (
	value: number | null | undefined,
	fallback: number,
): number => {
	if (typeof value === "number") {
		return value;
	}
	return fallback;
};

// Applies a change from the plain text textarea to the underlying marked up value
// guided by the textarea text selection ranges before and after the change
const applyChangeToValue = (
	value: string,
	plainTextValue: string,
	selection: SelectionChange,
	config: ReadonlyArray<MentionChildConfig>,
): string => {
	let selectionStartBefore = normalizeSelectionPoint(
		selection.selectionStartBefore,
	);
	let selectionEndBefore = normalizeSelectionPoint(
		selection.selectionEndBefore,
	);
	const { selectionEndAfter } = selection;

	const oldPlainTextValue = getPlainText(value, config);

	const lengthDelta = oldPlainTextValue.length - plainTextValue.length;
	if (selectionStartBefore === undefined) {
		selectionStartBefore = selectionEndAfter + lengthDelta;
	}

	if (selectionEndBefore === undefined) {
		selectionEndBefore = selectionStartBefore;
	}

	// Fixes an issue with replacing combined characters for complex input. Eg like accented letters on OSX
	if (
		selectionStartBefore === selectionEndBefore &&
		selectionEndBefore === selectionEndAfter &&
		oldPlainTextValue.length === plainTextValue.length
	) {
		selectionStartBefore -= 1;
		selectionEndBefore -= 1;
		// TODO: write tests to determine if this should instead be:
		// Prevent selectionStartBefore and selectionEndBefore from becoming negative by
		// selectionStartBefore = Math.max(0, selectionStartBefore - 1)
		// selectionEndBefore = Math.max(0, selectionEndBefore - 1)
	}

	// extract the insertion from the new plain text value
	let insert = plainTextValue.slice(selectionStartBefore, selectionEndAfter);

	// handling for Backspace key with no range selection
	let spliceStart = Math.min(selectionStartBefore, selectionEndAfter);

	let spliceEnd = selectionEndBefore;
	if (selectionStartBefore === selectionEndAfter) {
		// handling for Delete key with no range selection
		spliceEnd = Math.max(
			selectionEndBefore,
			selectionStartBefore + lengthDelta,
		);
	}

	let mappedSpliceStart = ensureNumber(
		mapPlainTextIndex(value, config, spliceStart, "START"),
		value.length,
	);
	let mappedSpliceEnd = ensureNumber(
		mapPlainTextIndex(value, config, spliceEnd, "END"),
		value.length,
	);

	const controlSpliceStart = mapPlainTextIndex(
		value,
		config,
		spliceStart,
		"NULL",
	);
	const controlSpliceEnd = mapPlainTextIndex(value, config, spliceEnd, "NULL");
	const willRemoveMention =
		controlSpliceStart === null || controlSpliceEnd === null;

	let newValue = spliceString(
		value,
		mappedSpliceStart,
		mappedSpliceEnd,
		insert,
	);

	if (!willRemoveMention) {
		// test for auto-completion changes
		const controlPlainTextValue = getPlainText(newValue, config);
		if (controlPlainTextValue !== plainTextValue) {
			// some auto-correction is going on

			// find start of diff
			spliceStart = 0;
			while (
				plainTextValue[spliceStart] === controlPlainTextValue[spliceStart]
			) {
				spliceStart++;
			}

			// extract auto-corrected insertion
			insert = plainTextValue.slice(spliceStart, selectionEndAfter);

			// find index of the unchanged remainder
			spliceEnd = oldPlainTextValue.lastIndexOf(
				plainTextValue.substring(selectionEndAfter),
			);

			// re-map the corrected indices
			mappedSpliceStart = ensureNumber(
				mapPlainTextIndex(value, config, spliceStart, "START"),
				value.length,
			);
			mappedSpliceEnd = ensureNumber(
				mapPlainTextIndex(value, config, spliceEnd, "END"),
				value.length,
			);
			newValue = spliceString(
				value,
				mappedSpliceStart,
				mappedSpliceEnd,
				insert,
			);
		}
	}

	return newValue;
};

export default applyChangeToValue;
