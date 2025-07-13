import React from 'react';
import { CreditCard } from 'lucide-react';
import { type CardBrand } from '@/app/dashboard/cards/actions';

interface CardIconProps extends React.SVGProps<SVGSVGElement> {
  brand: CardBrand;
}

const VisaIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="1000" height="318" viewBox="0 0 1000 318" {...props}>
        <path fill="#1A1F71" d="M381.7 101.9h-57.3l-59-88.8h60.4l34.8 54.4 34.8-54.4h52.3L381.7 101.9zM212.5 13.1h-57.3l-90.4 175.7 34.8 54.4L212.5 13.1z"></path>
        <path fill="#1A1F71" d="M625.3 13.1L538 188.8l-19.1-39.7-41.6-86.2-120.9.1.2 86.2-34.8-86.3H212.5l109.5 251.8h60.4l155.5-251.8z"></path>
        <path fill="#F7B600" d="M999.9 203.8c0 53-33.1 82.3-88.8 82.3h-90.4V13.1h90.4c55.7 0 88.8 29.3 88.8 82.3v108.4zM904 104.4c0-20.8-9.4-31-29.3-31h-34.8v117.3h34.8c19.9 0 29.3-10.2 29.3-31V104.4z"></path>
        <path fill="#1A1F71" d="M787.5 13.1h-52.3v251.8h52.3zM677.6 13.1l-109.5 251.8h53.9l20.8-48.4h86.2l12.4 48.4h52.3L705.2 13.1h-27.6zm-17.4 152.1l29.3-69.1 29.3 69.1h-58.6z"></path>
        <path fill="#1A1F71" d="M.1 13.1l109.4 251.8h57.3l-45-108.3 43.3-3.6-22.5-139.9z"></path>
    </svg>
);

const MastercardIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" {...props}>
        <circle cx="24" cy="24" r="24" fill="#ff5f00"></circle>
        <path d="M12 24c0 6.627 5.373 12 12 12s12-5.373 12-12c0-6.627-5.373-12-12-12s-12 5.373-12 12z" fill="#eb001b"></path>
        <path d="M24 12c-3.79 0-7.14 1.74-9.445 4.545a12.003 12.003 0 0118.89 0C31.14 13.74 27.79 12 24 12z" fill="#f79e1b"></path>
    </svg>
);


const AmexIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 20" {...props}>
    <rect width="32" height="20" rx="3" fill="#006FCF"/>
    <path fill="#fff" d="M13.2 5.3h5.6v1.2h-4.4v2h3.8v1.2h-3.8v2.2h4.5v1.2h-5.7zM20.2 5.3h3.4l2.2 6.8h.1l2.2-6.8h3.3v8.8h-1.3V7.2h-.1l-2.6 6.9h-1.3l-2.6-6.9h-.1v6.9h-1.2zM5.3 5.3h1.8l3 4.4v-4.4h1.2v8.8h-1.7L6.6 9.7v4.4H5.3z"/>
  </svg>
);


const EloIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 72" {...props}>
        <rect width="128" height="72" rx="7.2" fill="#292929"></rect>
        <path fill="#FEC83E" d="M22.5 25.3h22.4v5.3H27.8v4.2h16.2v5.3H27.8v4.8h17.5v5.3H22.5z"></path>
        <path fill="#02A8E0" d="M51.1 25.3h23.2v5.3H56.4v19.6h-5.3z"></path>
        <path fill="#E62128" d="M80.4 44.9c0 3.3 2.6 5.9 5.9 5.9s5.9-2.6 5.9-5.9c0-3.2-2.6-5.9-5.9-5.9s-5.9 2.7-5.9 5.9zm16.5-19.6c0-3.3-2.6-5.9-5.9-5.9s-5.9 2.6-5.9 5.9c0 3.2 2.6 5.9 5.9 5.9s5.9-2.7 5.9-5.9z"></path>
    </svg>
);


const brandIcons: Record<CardBrand, React.FC<React.SVGProps<SVGSVGElement>>> = {
  visa: VisaIcon,
  mastercard: MastercardIcon,
  elo: EloIcon,
  amex: AmexIcon,
  hipercard: (props) => <CreditCard {...props} />, // Placeholder
  diners: (props) => <CreditCard {...props} />, // Placeholder
  other: (props) => <CreditCard {...props} />,
};

const CardIcon: React.FC<CardIconProps> = ({ brand, ...props }) => {
  const IconComponent = brandIcons[brand] || brandIcons.other;
  return <IconComponent {...props} />;
};

export default CardIcon;
