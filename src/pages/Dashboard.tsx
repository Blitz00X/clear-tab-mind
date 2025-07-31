import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  LogOut, 
  Plus, 
  ExternalLink, 
  Filter, 
  Trash2,
  BookOpen,
  Archive
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

  const loadSavedTabs = async () => {
    try {
      const { data, error } = await supabase
        .from('saved_tabs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSavedTabs((data || []) as SavedTab[]);
    } catch (error: any) {
      toast({
        title: "Error loading tabs",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

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
    } catch (error: any) {
      toast({
        title: "Error saving tab",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const updateTabStatus = async (tabId: string, status: 'read' | 'archived') => {
    try {
      const { error } = await supabase
        .from('saved_tabs')
        .update({ status })
        .eq('id', tabId);

      if (error) throw error;
      loadSavedTabs();
    } catch (error: any) {
      toast({
        title: "Error updating tab",
        description: error.message,
        variant: "destructive"
      });
    }
  };

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
    } catch (error: any) {
      toast({
        title: "Error deleting tab",
        description: error.message,
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

              <div className="grid gap-4">
                {filteredTabs.filter(tab => tab.status === 'unread').map((tab) => (
                  <Card key={tab.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-lg mb-2 truncate">{tab.title}</h3>
                          <p className="text-sm text-muted-foreground mb-2">{tab.domain}</p>
                          {tab.note && (
                            <p className="text-sm mb-3 p-2 bg-muted rounded">{tab.note}</p>
                          )}
                          <div className="flex flex-wrap gap-2 mb-3">
                            {tab.tags.map((tag) => (
                              <Badge key={tag} variant="secondary">{tag}</Badge>
                            ))}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <Button
                            size="sm"
                            onClick={() => window.open(tab.url, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateTabStatus(tab.id, 'read')}
                          >
                            <BookOpen className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateTabStatus(tab.id, 'archived')}
                          >
                            <Archive className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteTab(tab.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {filteredTabs.filter(tab => tab.status === 'unread').length === 0 && (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <p className="text-muted-foreground">No unread tabs in your queue!</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* All Tabs View */}
          <TabsContent value="all">
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <h2 className="text-xl font-semibold">All Saved Tabs</h2>
                <div className="flex gap-2">
                  <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
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

              <div className="grid gap-4">
                {filteredTabs.map((tab) => (
                  <Card key={tab.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-lg truncate">{tab.title}</h3>
                            <Badge variant={
                              tab.status === 'unread' ? 'default' :
                              tab.status === 'read' ? 'secondary' : 'outline'
                            }>
                              {tab.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{tab.domain}</p>
                          {tab.note && (
                            <p className="text-sm mb-3 p-2 bg-muted rounded">{tab.note}</p>
                          )}
                          <div className="flex flex-wrap gap-2 mb-3">
                            {tab.tags.map((tag) => (
                              <Badge key={tag} variant="secondary">{tag}</Badge>
                            ))}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Added {new Date(tab.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2">
                          <Button
                            size="sm"
                            onClick={() => window.open(tab.url, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          {tab.status === 'unread' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateTabStatus(tab.id, 'read')}
                            >
                              <BookOpen className="h-4 w-4" />
                            </Button>
                          )}
                          {tab.status !== 'archived' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateTabStatus(tab.id, 'archived')}
                            >
                              <Archive className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteTab(tab.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {filteredTabs.length === 0 && (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <p className="text-muted-foreground">No tabs found matching your criteria.</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}