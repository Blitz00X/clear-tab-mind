import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TabList } from '@/components/TabList';
import {
  LogOut,
  Plus
} from 'lucide-react';

interface SavedTab {
  id: string;
  title: string;
  url: string;
  domain: string;
  tags: string[];
  note: string;
  status: 'unread' | 'read' | 'archived';
  created_at: string;
}

/**
 * Dashboard displaying and managing saved browser tabs.
 * Requires an authenticated user and interacts with Supabase to
 * fetch and mutate tab data.
 */
export default function Dashboard() {
  const { user, signOut } = useAuth();
  const [savedTabs, setSavedTabs] = useState<SavedTab[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read' | 'archived'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Add new tab form state
  const [newTab, setNewTab] = useState({
    title: '',
    url: '',
    tags: '',
    note: ''
  });

  useEffect(() => {
    if (user) {
      loadSavedTabs();
    }
  }, [user]);

  /**
   * Fetches the user's saved tabs from Supabase.
   * Updates local state and handles errors via toast notifications.
   */
  const loadSavedTabs = async () => {
    try {
      const { data, error } = await supabase
        .from('saved_tabs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSavedTabs((data || []) as SavedTab[]);
      } catch (error: unknown) {
        toast({
          title: "Error loading tabs",
          description: error instanceof Error ? error.message : String(error),
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

  /**
   * Handles submission of the "Add Tab" form.
   * Validates and saves a new tab record to Supabase.
   *
   * @param e - Form submission event.
   */
  const handleAddTab = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = new URL(newTab.url);
      const domain = url.hostname;
      const tags = newTab.tags.split(',').map(tag => tag.trim()).filter(Boolean);

      const { error } = await supabase
        .from('saved_tabs')
        .insert({
          user_id: user?.id,
          title: newTab.title,
          url: newTab.url,
          domain,
          tags,
          note: newTab.note
        });

      if (error) throw error;

      toast({
        title: "Tab saved!",
        description: "Your tab has been saved successfully."
      });

      setNewTab({ title: '', url: '', tags: '', note: '' });
      loadSavedTabs();
      } catch (error: unknown) {
        toast({
          title: "Error saving tab",
          description: error instanceof Error ? error.message : String(error),
          variant: "destructive"
        });
      }
    };


  /**
   * Removes a tab permanently from Supabase.
   *
   * @param tabId - Identifier of the tab to delete.
   */
  const deleteTab = async (tabId: string) => {
    try {
      const { error } = await supabase
        .from('saved_tabs')
        .delete()
        .eq('id', tabId);

      if (error) throw error;
      loadSavedTabs();
      toast({
        title: "Tab deleted",
        description: "The tab has been removed."
      });
      } catch (error: unknown) {
        toast({
          title: "Error deleting tab",
          description: error instanceof Error ? error.message : String(error),
          variant: "destructive"
        });
      }
    };

  const filteredTabs = savedTabs.filter(tab => {
    const matchesFilter = filter === 'all' || tab.status === filter;
    const matchesSearch = searchQuery === '' || 
      tab.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tab.domain.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tab.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesFilter && matchesSearch;
  });

  /**
   * Calculates counts of tabs by status for display in tabs.
   *
   * @returns Object containing counts for all, unread, read and archived tabs.
   */
  const getStatusCounts = () => {
    return {
      all: savedTabs.length,
      unread: savedTabs.filter(tab => tab.status === 'unread').length,
      read: savedTabs.filter(tab => tab.status === 'read').length,
      archived: savedTabs.filter(tab => tab.status === 'archived').length
    };
  };

  const counts = getStatusCounts();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading your tabs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">ZeroTab Dashboard</h1>
            <p className="text-muted-foreground">Welcome back, {user?.email}</p>
          </div>
          <Button variant="outline" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="queue" className="space-y-6">
          <TabsList>
            <TabsTrigger value="queue">
              Queue ({counts.unread})
            </TabsTrigger>
            <TabsTrigger value="all">
              All Tabs ({counts.all})
            </TabsTrigger>
            <TabsTrigger value="add">
              <Plus className="mr-1 h-4 w-4" />
              Add Tab
            </TabsTrigger>
          </TabsList>

          {/* Add Tab */}
          <TabsContent value="add">
            <Card>
              <CardHeader>
                <CardTitle>Save New Tab</CardTitle>
                <CardDescription>
                  Add a new tab to your ZeroTab queue
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddTab} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Title</Label>
                      <Input
                        id="title"
                        value={newTab.title}
                        onChange={(e) => setNewTab({ ...newTab, title: e.target.value })}
                        placeholder="Page title"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="url">URL</Label>
                      <Input
                        id="url"
                        type="url"
                        value={newTab.url}
                        onChange={(e) => setNewTab({ ...newTab, url: e.target.value })}
                        placeholder="https://example.com"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tags">Tags (comma separated)</Label>
                    <Input
                      id="tags"
                      value={newTab.tags}
                      onChange={(e) => setNewTab({ ...newTab, tags: e.target.value })}
                      placeholder="video, article, important"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="note">Note (optional)</Label>
                    <Textarea
                      id="note"
                      value={newTab.note}
                      onChange={(e) => setNewTab({ ...newTab, note: e.target.value })}
                      placeholder="Any notes about this content..."
                      rows={3}
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    <Plus className="mr-2 h-4 w-4" />
                    Save Tab
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Queue View */}
          <TabsContent value="queue">
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <h2 className="text-xl font-semibold">Unread Queue</h2>
                <div className="flex gap-2">
                  <Input
                    placeholder="Search tabs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-64"
                  />
                </div>
              </div>

              <TabList
                tabs={filteredTabs.filter(tab => tab.status === 'unread')}
                onOpen={(url) => window.open(url, '_blank')}
                onDelete={deleteTab}
                emptyMessage="No unread tabs in your queue!"
              />
            </div>
          </TabsContent>

          {/* All Tabs View */}
          <TabsContent value="all">
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <h2 className="text-xl font-semibold">All Saved Tabs</h2>
                <div className="flex gap-2">
                  <Select value={filter} onValueChange={(value: 'all' | 'unread' | 'read' | 'archived') => setFilter(value)}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All ({counts.all})</SelectItem>
                      <SelectItem value="unread">Unread ({counts.unread})</SelectItem>
                      <SelectItem value="read">Read ({counts.read})</SelectItem>
                      <SelectItem value="archived">Archived ({counts.archived})</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Search tabs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-64"
                  />
                </div>
              </div>

              <TabList
                tabs={filteredTabs}
                onOpen={(url) => window.open(url, '_blank')}
                onDelete={deleteTab}
                emptyMessage="No tabs found matching your criteria."
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
