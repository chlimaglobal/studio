
import { icons, LucideProps } from 'lucide-react';
import { iconNames } from '@/types';

interface IconProps extends LucideProps {
  name: keyof typeof icons;
}

const Icon = ({ name, color, size, className }: IconProps) => {
  const LucideIcon = icons[name];

  if (!LucideIcon) {
    return null; // Or return a default icon
  }

  return <LucideIcon color={color} size={size} className={className} />;
};

export default Icon;
