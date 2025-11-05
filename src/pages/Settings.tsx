import AppLayout from "@/components/AppLayout";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Moon, Sun, Monitor, Eye, FileText } from "lucide-react";
import { useState } from "react";

const Settings = () => {
  const [mode, setMode] = useState("dark");
  const [defaultAction, setDefaultAction] = useState("concise");

  return (
    <AppLayout>
      <div className="max-w-3xl">
        <h1 className="text-4xl font-bold mb-8">My Settings</h1>

        <div className="space-y-8">
          {/* Mode */}
          <div className="space-y-4">
            <div className="font-medium text-lg">Mode</div>
            <ToggleGroup type="single" value={mode} onValueChange={(v) => v && setMode(v)}>
              <ToggleGroupItem
                value="dark"
                aria-label="Dark mode"
                className="data-[state=on]:bg-accent data-[state=on]:text-accent-foreground"
              >
                <Moon className="w-4 h-4 mr-2" />
                Dark
              </ToggleGroupItem>
              <ToggleGroupItem value="system" aria-label="System mode">
                <Monitor className="w-4 h-4 mr-2" />
                System
              </ToggleGroupItem>
              <ToggleGroupItem value="light" aria-label="Light mode">
                <Sun className="w-4 h-4 mr-2" />
                Light
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          {/* Default Action */}
          <div className="space-y-4">
            <div>
              <div className="font-medium text-lg mb-1">Default Action</div>
              <p className="text-sm text-muted-foreground">
                Choose the default action for the content you add to Recall.
              </p>
            </div>
            <ToggleGroup
              type="single"
              value={defaultAction}
              onValueChange={(v) => v && setDefaultAction(v)}
            >
              <ToggleGroupItem value="reader" aria-label="Open reader">
                <Eye className="w-4 h-4 mr-2" />
                Open reader
              </ToggleGroupItem>
              <ToggleGroupItem
                value="concise"
                aria-label="Concise summary"
                className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
              >
                <FileText className="w-4 h-4 mr-2" />
                Concise summary
              </ToggleGroupItem>
              <ToggleGroupItem value="detailed" aria-label="Detailed summary">
                <FileText className="w-4 h-4 mr-2" />
                Detailed summary
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          {/* Translate Summaries */}
          <div className="space-y-4">
            <div>
              <div className="font-medium text-lg mb-1">Translate Summaries</div>
              <p className="text-sm text-muted-foreground">
                Choose a language for your summaries to be translated to. If you select Don't Translate, the language
                of the original content will be used.
              </p>
            </div>
            <Select defaultValue="none">
              <SelectTrigger className="w-full max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Don't Translate</SelectItem>
                <SelectItem value="fr">Français</SelectItem>
                <SelectItem value="es">Español</SelectItem>
                <SelectItem value="de">Deutsch</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Search Language */}
          <div className="space-y-4">
            <div>
              <div className="font-medium text-lg mb-1">Search Language</div>
              <p className="text-sm text-muted-foreground">
                This language will be used when you search for new knowledge cards within Recall.
              </p>
            </div>
            <Select defaultValue="en-gb">
              <SelectTrigger className="w-full max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en-gb">
                  <div className="flex items-center gap-2">
                    <span>🇬🇧</span>
                    <span>GB English</span>
                  </div>
                </SelectItem>
                <SelectItem value="en-us">
                  <div className="flex items-center gap-2">
                    <span>🇺🇸</span>
                    <span>US English</span>
                  </div>
                </SelectItem>
                <SelectItem value="fr">
                  <div className="flex items-center gap-2">
                    <span>🇫🇷</span>
                    <span>Français</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Font Size */}
          <div className="space-y-4">
            <div>
              <div className="font-medium text-lg mb-1">Font Size</div>
            </div>
            <Select defaultValue="medium">
              <SelectTrigger className="w-full max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">Small</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="large">Large</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Settings;


