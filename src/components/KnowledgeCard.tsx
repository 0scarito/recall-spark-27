import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Calendar } from "lucide-react";
import { format } from "date-fns";

interface KnowledgeCardProps {
  title: string;
  summary?: string;
  url?: string;
  tags: string[];
  contentType?: string;
  createdAt: string;
  onClick: () => void;
}

const KnowledgeCard = ({
  title,
  summary,
  url,
  tags,
  contentType,
  createdAt,
  onClick,
}: KnowledgeCardProps) => {
  return (
    <Card
      className="p-6 hover:shadow-lg hover:shadow-primary/10 transition-all cursor-pointer group bg-card/50 backdrop-blur-sm border-border/50"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-lg font-semibold group-hover:text-primary transition-colors line-clamp-2">
          {title}
        </h3>
        {url && (
          <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </div>

      {summary && (
        <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
          {summary}
        </p>
      )}

      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {contentType && (
            <Badge variant="secondary" className="text-xs">
              {contentType}
            </Badge>
          )}
          {tags.slice(0, 3).map((tag, index) => (
            <Badge key={index} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
          {tags.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{tags.length - 3}
            </Badge>
          )}
        </div>
        <div className="flex items-center text-xs text-muted-foreground">
          <Calendar className="w-3 h-3 mr-1" />
          {format(new Date(createdAt), 'MMM d, yyyy')}
        </div>
      </div>
    </Card>
  );
};

export default KnowledgeCard;