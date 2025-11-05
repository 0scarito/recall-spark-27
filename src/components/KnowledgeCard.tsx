import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AspectRatio } from "@/components/ui/aspect-ratio";

interface KnowledgeCardProps {
  title: string;
  summary?: string;
  url?: string;
  tags: string[];
  contentType?: string;
  createdAt: string;
  onClick: () => void;
  thumbnail?: string;
}

const KnowledgeCard = ({
  title,
  summary,
  url,
  tags,
  contentType,
  createdAt,
  onClick,
  thumbnail,
}: KnowledgeCardProps) => {
  // Extract image from URL using a placeholder service based on domain
  const getPlaceholderImage = (url?: string) => {
    if (!url) return null;
    try {
      const domain = new URL(url).hostname;
      return `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(domain)}&backgroundColor=1e293b`;
    } catch {
      return null;
    }
  };

  const imageUrl = thumbnail || getPlaceholderImage(url);

  return (
    <Card
      className="group hover:shadow-lg transition-all duration-300 cursor-pointer border-border bg-card overflow-hidden rounded-lg"
      onClick={onClick}
    >
      {imageUrl && (
        <AspectRatio ratio={16 / 10} className="bg-muted/30">
          <img
            src={imageUrl}
            alt={title}
            className="object-cover w-full h-full group-hover:scale-[1.02] transition-transform duration-300"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </AspectRatio>
      )}
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="text-base font-semibold line-clamp-2 text-card-foreground group-hover:text-primary transition-colors">
          {title}
        </CardTitle>
      </CardHeader>
      {summary && (
        <CardContent className="pb-3 pt-0">
          <CardDescription className="line-clamp-2 text-sm text-muted-foreground">
            {summary}
          </CardDescription>
        </CardContent>
      )}
      <div className="px-6 pb-4">
        <div className="flex flex-wrap gap-2">
          {tags.filter((tag) => !tag.startsWith('collection:')).slice(0, 2).map((tag, idx) => (
            <Badge key={idx} className="bg-primary text-primary-foreground text-xs px-3 py-1 rounded-full">
              {tag}
            </Badge>
          ))}
          {tags.filter((tag) => !tag.startsWith('collection:')).length > 2 && (
            <Badge className="bg-primary text-primary-foreground text-xs px-3 py-1 rounded-full">
              +{tags.filter((tag) => !tag.startsWith('collection:')).length - 2}
            </Badge>
          )}
        </div>
      </div>
    </Card>
  );
};

export default KnowledgeCard;
