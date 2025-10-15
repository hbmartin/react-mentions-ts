import React from "react";
import useStyles from "substyle";
import type { ClassNamesProp, StyleOverride, Substyle } from "../types";

type Modifiers = Parameters<typeof useStyles>[2];

type StylingProps = {
	style?: StyleOverride;
	className?: string;
	classNames?: ClassNamesProp;
};

function createDefaultStyle(
	defaultStyle: Parameters<typeof useStyles>[0],
	getModifiers?: (props: Record<string, unknown>) => Modifiers,
) {
	return function enhance<P extends { style: Substyle }>(
		ComponentToWrap: React.ComponentType<P>,
	): React.ForwardRefExoticComponent<
		React.PropsWithoutRef<Omit<P, "style"> & StylingProps> &
			React.RefAttributes<unknown>
	> {
		const displayName =
			ComponentToWrap.displayName || ComponentToWrap.name || "Component";

		const Forwarded = React.forwardRef<
			unknown,
			Omit<P, "style"> & StylingProps
		>((props, ref) => {
			const { style, className, classNames, ...rest } = props as StylingProps &
				Omit<P, "style">;
			const modifiers = getModifiers
				? getModifiers(rest as unknown as Record<string, unknown>)
				: undefined;
			const styles = useStyles(
				defaultStyle,
				{ style, className, classNames },
				modifiers,
			);

			return (
				<ComponentToWrap
					{...(rest as Omit<P, "style">)}
					style={styles}
					ref={ref}
				/>
			);
		});

		Forwarded.displayName = `defaultStyle(${displayName})`;

		return Forwarded;
	};
}

export default createDefaultStyle;
