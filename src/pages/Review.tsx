import AppLayout from "@/components/AppLayout";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HelpCircle } from "lucide-react";

const Review = () => {
  return (
    <AppLayout>
      <div className="max-w-5xl p-8">
        {/* Top tabs bar */}
        <div className="border-b border-border mb-6">
          <Tabs defaultValue="review" className="w-full">
            <TabsList className="bg-transparent h-auto p-0">
              <TabsTrigger
                value="review"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
              >
                Recall Review
              </TabsTrigger>
              <TabsTrigger
                value="cards"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
              >
                Cards and Questions
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="space-y-8">
          <h1 className="text-4xl font-bold">Welcome to The Recall Review</h1>

          {/* What is it? and Getting Started cards */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>What is it?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  The Recall Review helps you remember the content you save to Recall. First, you generate questions for
                  specific knowledge cards you want to remember. Then, Recall will prompt you to answer the questions at
                  optimal points in time to maximize your retention on the topic.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Getting Started</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground text-sm leading-relaxed">
                  To get started, navigate to a knowledge card for which you want to generate questions. Click the card
                  menu button and select Generate Questions.
                </p>
                <Button variant="outline" className="w-full">
                  <HelpCircle className="w-4 h-4 mr-2" />
                  Learn More
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Your Progress card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle>Your Progress</CardTitle>
                  <div className="w-4 h-4 rounded-full bg-muted-foreground/20" />
                </div>
                <Select defaultValue="30">
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">Last 30 days</SelectItem>
                    <SelectItem value="7">Last 7 days</SelectItem>
                    <SelectItem value="90">Last 90 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 mb-4">
                <p className="text-sm text-muted-foreground">Correct Answers</p>
                {/* Line graph */}
                <div className="h-64 border rounded-md bg-muted/10 p-4 relative">
                  <svg className="w-full h-full" viewBox="0 0 400 200" preserveAspectRatio="none">
                    {/* Grid lines */}
                    <line x1="0" y1="20" x2="400" y2="20" stroke="currentColor" strokeWidth="0.5" opacity="0.1" />
                    <line x1="0" y1="180" x2="400" y2="180" stroke="currentColor" strokeWidth="0.5" opacity="0.1" />
                    {/* Data line */}
                    <polyline
                      points="0,40 40,35 80,30 120,38 160,32 200,28 240,25 280,22 320,20 360,18 400,20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="text-primary"
                    />
                    {/* Data points */}
                    {[0, 40, 80, 120, 160, 200, 240, 280, 320, 360, 400].map((x, i) => {
                      const y = 40 - (i * 2) + Math.sin(i) * 5;
                      return (
                        <circle key={i} cx={x} cy={y} r="3" fill="currentColor" className="text-primary" />
                      );
                    })}
                  </svg>
                  {/* Y-axis labels */}
                  <div className="absolute left-0 top-0 text-xs text-muted-foreground">1.0</div>
                  <div className="absolute left-0 bottom-0 text-xs text-muted-foreground">0.9</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default Review;


