// Untitled UI icon shim — maps the lucide-react icon names previously used in
// the codebase to their Untitled UI equivalents, while preserving the
// lucide-style API (size + strokeWidth + color props).
//
// Source: https://www.untitledui.com/free-icons (npm: @untitled-ui/icons-react)

import * as React from "react";
import {
  ArrowLeft as UiArrowLeft,
  ArrowRight as UiArrowRight,
  Calendar as UiCalendar,
  Camera01 as UiCamera,
  Check as UiCheck,
  ChevronDown as UiChevronDown,
  ChevronRight as UiChevronRight,
  Copy01 as UiCopy,
  Download01 as UiDownload,
  Eye as UiEye,
  EyeOff as UiEyeOff,
  Diamond01 as UiGem,
  Gift01 as UiGift,
  Image01 as UiImage,
  Loading01 as UiLoader,
  Lock01 as UiLock,
  Plus as UiPlus,
  RefreshCw01 as UiRefresh,
  Settings01 as UiSettings,
  ShoppingCart01 as UiShoppingCart,
  Stars02 as UiSparkles,
  Trash01 as UiTrash,
  User01 as UiUser,
  Users01 as UiUsers,
  MagicWand02 as UiWand,
  XClose as UiXClose,
} from "@untitled-ui/icons-react";

type LucideLikeProps = Omit<React.SVGProps<SVGSVGElement>, "ref"> & {
  size?: number | string;
  strokeWidth?: number | string;
  color?: string;
};

const wrap = (
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>,
): React.FC<LucideLikeProps> => {
  const Wrapped: React.FC<LucideLikeProps> = ({
    size = 24,
    strokeWidth,
    color,
    style,
    ...rest
  }) => {
    const merged: React.SVGProps<SVGSVGElement> = {
      width: size,
      height: size,
      style: color ? { color, ...style } : style,
      ...rest,
    };
    if (strokeWidth !== undefined) {
      (merged as React.SVGProps<SVGSVGElement> & { strokeWidth?: number | string }).strokeWidth =
        strokeWidth;
    }
    return <Icon {...merged} />;
  };
  Wrapped.displayName = Icon.displayName || Icon.name || "Icon";
  return Wrapped;
};

export const ArrowLeft = wrap(UiArrowLeft);
export const ArrowRight = wrap(UiArrowRight);
export const Calendar = wrap(UiCalendar);
export const Camera = wrap(UiCamera);
export const Check = wrap(UiCheck);
export const ChevronDown = wrap(UiChevronDown);
export const ChevronRight = wrap(UiChevronRight);
export const Copy = wrap(UiCopy);
export const Download = wrap(UiDownload);
export const Eye = wrap(UiEye);
export const EyeOff = wrap(UiEyeOff);
export const Gem = wrap(UiGem);
export const Gift = wrap(UiGift);
export const ImageIcon = wrap(UiImage);
export const Loader2 = wrap(UiLoader);
export const Lock = wrap(UiLock);
export const Plus = wrap(UiPlus);
export const RefreshCw = wrap(UiRefresh);
export const Settings = wrap(UiSettings);
export const ShoppingCart = wrap(UiShoppingCart);
export const Sparkles = wrap(UiSparkles);
export const Trash2 = wrap(UiTrash);
export const User = wrap(UiUser);
export const Users = wrap(UiUsers);
export const Wand2 = wrap(UiWand);
export const X = wrap(UiXClose);
