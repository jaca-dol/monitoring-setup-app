import React from 'react';
import {Pressable, StyleSheet, Switch, Text, View} from 'react-native';

import {SECTION_HELP} from '../../domain/help';
import {SECTION_TITLES, type SectionId} from '../../domain/screen';
import {colors, radius, spacing} from '../theme';

import {HelpSheet} from './HelpSheet';
import {Icon, type IconName} from './Icon';

/**
 * Building blocks matching `docs/SmartAdjust_concept_screens.html`.
 *
 * The structural idea worth preserving: **section headings sit outside the
 * cards**. A heading is an icon, a title and a help affordance on the page
 * background; the rows beneath it live in a white rounded card with hairline
 * dividers. That is what gives the concept its airy feel, and it is the part an
 * earlier build got wrong by putting tiny uppercase titles inside the cards.
 *
 * Light only — the concept has no dark variant.
 */

export type PillTone = 'ok' | 'band' | 'readonly' | 'bad';

export function Pill({
  label,
  tone,
}: {
  label: string;
  tone: PillTone;
}): React.JSX.Element {
  return (
    <View style={[styles.pill, PILL_BG[tone]]}>
      <Text style={[styles.pillText, PILL_TEXT[tone]]}>{label}</Text>
    </View>
  );
}

/** Navy bar: article name, with revision and band beneath it. */
export function AppBar({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string | undefined;
}): React.JSX.Element {
  return (
    <View style={styles.appBar}>
      <View style={styles.appBarTitles}>
        <Text style={styles.appBarTitle}>{title}</Text>
        {subtitle !== undefined && subtitle !== '' && (
          <Text style={styles.appBarSubtitle}>{subtitle}</Text>
        )}
      </View>
    </View>
  );
}

/**
 * Heading above a card — icon, title, help affordance.
 *
 * The `?` was drawn but inert until now. It only appears where there is help to
 * show: a question mark that answers nothing is worse than none, because it
 * spends the one place an unsure installer looks.
 */
export function SectionHeading({
  icon,
  title,
  onPressHelp,
}: {
  icon: IconName;
  title: string;
  onPressHelp?: (() => void) | undefined;
}): React.JSX.Element {
  return (
    <View accessibilityLabel={`section:${title}`} style={styles.sectionHeading}>
      <Icon name={icon} />
      <Text style={styles.sectionTitle}>{title}</Text>
      {onPressHelp !== undefined && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`About ${title}`}
          onPress={onPressHelp}
          // The mark is small by design; the tap target must not be.
          hitSlop={14}
          style={styles.help}>
          <Text style={styles.helpMark}>?</Text>
        </Pressable>
      )}
    </View>
  );
}

/**
 * A section heading wired to its help sheet.
 *
 * Owns the open/closed state so six sections do not each repeat it, and so the
 * sheet is mounted beside the heading that opens it.
 */
export function HelpfulSectionHeading({
  icon,
  section,
}: {
  icon: IconName;
  section: SectionId;
}): React.JSX.Element {
  const [open, setOpen] = React.useState(false);
  const title = SECTION_TITLES[section];

  return (
    <>
      <SectionHeading
        icon={icon}
        title={title}
        onPressHelp={() => setOpen(true)}
      />
      <HelpSheet
        visible={open}
        title={title}
        help={SECTION_HELP[section]}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

/** White rounded card holding rows. */
export function Card({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return <View style={styles.card}>{children}</View>;
}

/**
 * A card row.
 *
 * Left: a label with an optional explanatory sub-label. Right: a value with an
 * optional smaller detail line, a pill, a chevron, or a control. Renders
 * nothing when there is no value and no control — which is how REQ-A-14's
 * "showing only applicable rows" is enforced.
 */
export function Row({
  label,
  sublabel,
  value,
  detail,
  pill,
  chevron,
  control,
  onPress,
  mono,
}: {
  label: string;
  sublabel?: string | null | undefined;
  value?: string | null | undefined;
  detail?: string | null | undefined;
  pill?: {label: string; tone: PillTone} | undefined;
  chevron?: boolean | undefined;
  control?: React.ReactNode;
  onPress?: (() => void) | undefined;
  mono?: boolean | undefined;
}): React.JSX.Element | null {
  const hasValue = value !== null && value !== undefined && value !== '';
  if (!hasValue && control === undefined && pill === undefined) {
    return null;
  }

  const body = (
    <View style={styles.row}>
      <View style={styles.rowLabelWrap}>
        <Text style={styles.rowLabel}>{label}</Text>
        {sublabel !== null && sublabel !== undefined && sublabel !== '' && (
          <Text style={styles.rowSublabel}>{sublabel}</Text>
        )}
      </View>

      {control !== undefined ? (
        control
      ) : (
        <View style={styles.rowValueWrap}>
          {hasValue && (
            <Text
              selectable
              style={[styles.rowValue, mono === true && styles.rowValueMono]}>
              {value}
            </Text>
          )}
          {detail !== null && detail !== undefined && detail !== '' && (
            <Text style={styles.rowDetail}>{detail}</Text>
          )}
        </View>
      )}

      {pill !== undefined && <Pill label={pill.label} tone={pill.tone} />}
      {chevron === true && <Text style={styles.chevron}>›</Text>}
    </View>
  );

  if (onPress === undefined) {
    return body;
  }
  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      {body}
    </Pressable>
  );
}

export function Toggle({
  value,
  onChange,
  disabled,
}: {
  value: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean | undefined;
}): React.JSX.Element {
  return (
    <Switch
      value={value}
      onValueChange={onChange}
      disabled={disabled}
      trackColor={{false: colors.toggleOff, true: colors.toggleOnTrack}}
      thumbColor={value ? colors.navyDeep : '#ffffff'}
    />
  );
}

/** The two white secondary buttons above the apply bar. */
export function SecondaryButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean | undefined;
}): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={[styles.secondary, disabled === true && styles.disabled]}>
      <Text style={styles.secondaryLabel}>{label}</Text>
    </Pressable>
  );
}

/** The green full-width apply bar. */
export function ApplyBar({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean | undefined;
}): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={[styles.apply, disabled === true && styles.disabled]}>
      <Text style={styles.applyLabel}>{label}</Text>
    </Pressable>
  );
}

/** Amber advisory, e.g. an unqualified revision. */
export function Banner({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <View style={styles.banner}>
      <Text style={styles.bannerTitle}>{title}</Text>
      <Text style={styles.bannerBody}>{children}</Text>
    </View>
  );
}

const PILL_BG: Record<PillTone, {backgroundColor: string}> = {
  ok: {backgroundColor: colors.greenPillBg},
  band: {backgroundColor: colors.bandPillBg},
  readonly: {backgroundColor: colors.readOnlyPillBg},
  bad: {backgroundColor: colors.redPillBg},
};

const PILL_TEXT: Record<PillTone, {color: string}> = {
  ok: {color: colors.green},
  band: {color: colors.navy},
  readonly: {color: colors.readOnlyPillText},
  bad: {color: colors.red},
};

export const styles = StyleSheet.create({
  appBar: {
    backgroundColor: colors.navy,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  appBarTitles: {alignItems: 'center'},
  appBarTitle: {color: '#ffffff', fontSize: 16, fontWeight: '600'},
  appBarSubtitle: {color: colors.navySoft, fontSize: 11, marginTop: 1},

  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    marginTop: spacing.md,
    marginBottom: spacing.sm + 1,
    marginHorizontal: spacing.xs,
  },
  sectionTitle: {flex: 1, fontSize: 16, fontWeight: '600', color: colors.ink},
  help: {
    width: 19,
    height: 19,
    borderRadius: 10,
    borderWidth: 1.6,
    borderColor: '#444444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpMark: {fontSize: 11, color: '#444444', lineHeight: 13},

  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    overflow: 'hidden',
    shadowColor: '#101828',
    shadowOpacity: 0.08,
    shadowRadius: 3,
    shadowOffset: {width: 0, height: 1},
    elevation: 1,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  rowLabelWrap: {flex: 1, minWidth: 0},
  rowLabel: {fontSize: 14, fontWeight: '500', color: colors.ink},
  rowSublabel: {fontSize: 11.5, color: colors.muted, marginTop: 1},
  rowValueWrap: {alignItems: 'flex-end', flexShrink: 1},
  rowValue: {
    fontSize: 13.5,
    fontWeight: '500',
    color: colors.ink,
    textAlign: 'right',
  },
  rowValueMono: {fontFamily: 'monospace', fontSize: 11.5},
  rowDetail: {fontSize: 11.5, color: colors.muted, textAlign: 'right'},
  chevron: {color: colors.chevron, fontSize: 18},

  pill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  pillText: {fontSize: 11, fontWeight: '600'},

  secondary: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.button,
    paddingVertical: 12,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    shadowColor: '#101828',
    shadowOpacity: 0.08,
    shadowRadius: 3,
    shadowOffset: {width: 0, height: 1},
    elevation: 1,
  },
  secondaryLabel: {fontSize: 13, fontWeight: '500', color: colors.navy},

  apply: {
    backgroundColor: colors.green,
    borderRadius: radius.button,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: spacing.md,
    shadowColor: colors.green,
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: {width: 0, height: 2},
    elevation: 2,
  },
  applyLabel: {color: '#ffffff', fontSize: 15, fontWeight: '600'},

  disabled: {opacity: 0.45},

  banner: {
    backgroundColor: colors.amberBg,
    borderColor: colors.amberBorder,
    borderWidth: 1,
    borderRadius: radius.button,
    padding: 12,
    marginTop: spacing.sm,
  },
  bannerTitle: {fontSize: 12, fontWeight: '600', color: colors.amberText},
  bannerBody: {fontSize: 12, lineHeight: 17, color: colors.amberText},
});
