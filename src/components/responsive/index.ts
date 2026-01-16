/**
 * Responsive Design System - Component Index
 *
 * This file exports all responsive components for easy importing.
 *
 * @example
 * ```tsx
 * import { ResponsiveGrid, TouchButton, ResponsiveTable } from '@/components/responsive';
 * ```
 */

// Grid System
export {
  ResponsiveGrid,
  ResponsiveContainer,
  ResponsiveStack,
  ResponsiveColumns,
  ResponsiveMasonry,
  ResponsiveSection,
} from './ResponsiveGrid';
export type {
  ResponsiveGridProps,
  ResponsiveContainerProps,
  ResponsiveStackProps,
  ResponsiveColumnsProps,
  ResponsiveMasonryProps,
  ResponsiveSectionProps,
} from './ResponsiveGrid';

// Touch-Friendly Components
export {
  TouchButton,
  SwipeableCard,
  PullToRefresh,
  LongPressButton,
  TapFeedback,
} from './TouchFriendly';
export type {
  TouchButtonProps,
  SwipeableCardProps,
  PullToRefreshProps,
  LongPressButtonProps,
} from './TouchFriendly';

// Responsive Table
export {
  ResponsiveTable,
  ResponsiveDataList,
} from './ResponsiveTable';
export type {
  ResponsiveTableProps,
  ResponsiveDataListProps,
  Column,
} from './ResponsiveTable';

// Responsive Forms
export {
  ResponsiveForm,
  ResponsiveFormField,
  ResponsiveInput,
  ResponsiveTextarea,
  ResponsiveSelect,
  ResponsiveCheckbox,
  ResponsiveRadio,
} from './ResponsiveForms';
export type {
  ResponsiveFormProps,
  ResponsiveFormFieldProps,
  ResponsiveInputProps,
} from './ResponsiveForms';

// Responsive Images
export {
  ResponsiveImage,
  ResponsivePicture,
  ResponsiveAvatar,
  ResponsiveGallery,
} from './ResponsiveImage';
export type {
  ResponsiveImageProps,
  ResponsivePictureProps,
  ResponsiveAvatarProps,
  ResponsiveGalleryProps,
} from './ResponsiveImage';
