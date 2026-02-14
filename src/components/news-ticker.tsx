
'use client';

import React, { useState, useEffect } from 'react';
import { Newspaper } from 'lucide-react';

interface NewsItem {
  title: string;
  url: string;
}

const NewsTicker: React.FC = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const response = await fetch('/api/news');
        if (!response.ok) {
          // Log a warning instead of throwing an error to avoid the Next.js error overlay.
          console.warn(`Failed to fetch news, ticker will be hidden. Status: ${response.status}`);
          setError('Failed to fetch news.'); // Set error state to hide the component.
          return;
        }
        const data = await response.json();
        
        if (data.feed) {
          setNews(data.feed.slice(0, 20)); // Limit to 20 news items
        } else {
          // If the API returns an error message in the body
          if(data.error) {
            console.warn('News API error:', data.error);
          }
          setNews([]);
        }

      } catch (err) {
        console.error('Error fetching news:', err);
        setError('Could not load news'); // Show error only if fetch fails completely
      } finally {
        setIsLoading(false);
      }
    };

    fetchNews();
  }, []);

  if (isLoading || error || news.length === 0) {
    // Render nothing if loading, error, or no news to avoid layout shift
    return null;
  }

  // Duplicate the news array to create a seamless loop
  const duplicatedNews = [...news, ...news];

  return (
    <div className="relative flex overflow-hidden bg-secondary/50 text-secondary-foreground border-y border-border h-10 items-center">
      <div className="flex-shrink-0 bg-primary/80 text-primary-foreground h-full flex items-center px-4 z-10">
        <Newspaper className="h-5 w-5" />
      </div>
      <div className="flex-shrink-0 font-semibold px-4 text-sm z-10 hidden sm:block">
        Mercado Agora
      </div>
      <div className="animate-marquee-infinite flex space-x-8 whitespace-nowrap items-center h-full">
        {duplicatedNews.map((item, index) => (
          <a
            key={index}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm hover:underline hover:text-primary transition-colors"
          >
            {item.title}
          </a>
        ))}
      </div>
      <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-secondary/50 to-transparent z-20"></div>
      <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-secondary/50 to-transparent z-20"></div>

      <style jsx>{`
        @keyframes marquee-infinite {
          0% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .animate-marquee-infinite {
          animation: marquee-infinite 400s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default NewsTicker;
