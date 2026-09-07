import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { Creator, Reel } from './data/creators';
import { CreatorCard } from './components/CreatorCard';
import { Plus, Check, AlertCircle, X, CheckSquare, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const NICHE_OPTIONS = [
  'Cafes', 'Street Food', 'Restaurants', 'Dining', 'Desserts',
  'Hidden Gems', 'Shopping', 'Lifestyle'
];


export interface Campaign {
  id: string;
  name: string;
  date: string;
  creators: Creator[];
}

export default function App() {
  const [creatorsList, setCreatorsList] = useState<Creator[]>([]);
  const [campaignList, setCampaignList] = useState<Creator[]>([]);
  const [allCampaigns, setAllCampaigns] = useState<Campaign[]>([]);
  const [showCampaignsModal, setShowCampaignsModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // New Creator Form State
  const [newName, setNewName] = useState('');
  const [newProfileUrl, setNewProfileUrl] = useState('');
  const [newFollowers, setNewFollowers] = useState('');
  const [newNiches, setNewNiches] = useState<string[]>([]);
  const [newReels, setNewReels] = useState<Reel[]>([{
    id: `reel_${Date.now()}_0`,
    label: 'Demo Reel',
    videoUrl: '',
  }]);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);

  const [modalError, setModalError] = useState<string | null>('');
  const [isSavingCreator, setIsSavingCreator] = useState(false);
  const [editingCreator, setEditingCreator] = useState<Creator | null>(null);

  // Simple Router Detection based on window.location.pathname
  const [isAdminView, setIsAdminView] = useState(() => window.location.pathname === '/kalva');

  const [submittingCampaign, setSubmittingCampaign] = useState(false);

  // Listen to popstate event
  useEffect(() => {
    const handleLocationChange = () => {
      setIsAdminView(window.location.pathname === '/kalva');
    };
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  // Initialize creators from local data
  useEffect(() => {
    const loadCreators = () => {
      import('./data/creators').then(module => {
        const parsed = [...module.creators];
        parsed.sort((a: Creator, b: Creator) => {
          const idA = parseInt(a.id.split('_')[1] || '0');
          const idB = parseInt(b.id.split('_')[1] || '0');
          return idB - idA;
        });
        setCreatorsList(parsed);
      }).catch(e => {
        console.error("Failed to load local creators data", e);
      });
    };
    loadCreators();
  }, []);

  // Load campaign list from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('trylocal_campaignList');
    if (saved) {
      try {
        setCampaignList(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const triggerStatus = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 5000);
  };

  const handleUpdateName = (id: string, newName: string) => {
    const updated = creatorsList.map((c) => (c.id === id ? { ...c, name: newName } : c));
    setCreatorsList(updated);
    saveCreatorsToBackend(updated);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this local creator?')) {
      const updated = creatorsList.filter((c) => c.id !== id);
      setCreatorsList(updated);

      if (campaignList.some(c => c.id === id)) {
        const updatedCampaign = campaignList.filter(c => c.id !== id);
        setCampaignList(updatedCampaign);
        localStorage.setItem('trylocal_campaignList', JSON.stringify(updatedCampaign));
      }

      saveCreatorsToBackend(updated);
      triggerStatus('success', 'Creator successfully deleted.');
    }
  };

  const saveCreatorsToBackend = async (list: Creator[]) => {
    try {
      const { error } = await supabase.storage
        .from('creator-data')
        .upload('trylocal_creators.json', JSON.stringify(list, null, 2), {
          contentType: 'application/json',
          upsert: true,
        });

      if (error) throw error;
    } catch (e: any) {
      console.error(e);
      triggerStatus('error', `Failed to persist roster to cloud: ${e.message}`);
    }
  };

  const handleToggleCampaign = (creator: Creator) => {
    setCampaignList((prevList) => {
      const exists = prevList.some((c) => c.id === creator.id);
      let updated: Creator[];

      if (exists) {
        updated = prevList.filter((c) => c.id !== creator.id);
        setTimeout(() => triggerStatus('success', `Removed ${creator.name.split(' ')[0]} from Campaign shortlist.`), 0);
      } else {
        updated = [...prevList, creator];
        setTimeout(() => triggerStatus('success', `Added ${creator.name.split(' ')[0]} to Campaign shortlist.`), 0);
      }
      localStorage.setItem('trylocal_campaignList', JSON.stringify(updated));
      return updated;
    });
  };

  const handleSubmitCampaign = async () => {
    if (campaignList.length === 0) return;
    
    const campaignName = window.prompt("Please enter the name for this Campaign:");
    if (!campaignName) return;
    
    const makerName = window.prompt("Please enter your name (who is making this sheet):");
    if (!makerName) return;
    
    setSubmittingCampaign(true);
    triggerStatus('success', 'Submitting shortlist...');

    try {
      const newCampaign: Campaign = {
        id: `camp_${Date.now()}`,
        name: campaignName,
        date: new Date().toISOString(),
        creators: campaignList
      };
      const updatedCampaigns = [...allCampaigns, newCampaign];
      setAllCampaigns(updatedCampaigns);

      triggerStatus('success', `✓ Successfully submitted ${campaignList.length} creators to Campaign!`);
      setCampaignList([]);
      localStorage.removeItem('trylocal_campaignList');
    } catch (e: any) {
      console.error(e);
      triggerStatus('error', `Submission failed: ${e.message}`);
    } finally {
      setSubmittingCampaign(false);
    }
  };

  const resetAddModal = () => {
    setNewName('');
    setNewProfileUrl('');
    setNewFollowers('');
    setNewNiches([]);
    setNewReels([{ id: `reel_${Date.now()}_0`, videoUrl: '', label: '' }]);
    setModalError(null);
    setEditingCreator(null);
  };

  const handleEditCreator = (creator: Creator) => {
    setEditingCreator(creator);
    setNewName(creator.name);
    setNewProfileUrl(creator.profileUrl || '');
    setNewFollowers(creator.followers || '');
    setNewNiches(creator.niches || []);
    
    if (creator.reels && creator.reels.length > 0) {
      setNewReels([creator.reels[0]]);
    } else {
      setNewReels([{
        id: `reel_${Date.now()}_0`,
        label: 'Demo Reel',
        videoUrl: '',
      }]);
    }
    setShowAddModal(true);
  };

  const handleAddCreator = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');

    if (!newName.trim()) {
      setModalError('Creator name is required.');
      return;
    }
    if (newNiches.length === 0) {
      setModalError('Select at least one category.');
      return;
    }

    setIsSavingCreator(true);

    try {
      const updatedCreator: Creator = {
        id: editingCreator ? editingCreator.id : `local_${Date.now()}`,
        name: newName.trim(),
        handle: '',
        profileUrl: newProfileUrl.trim(),
        followers: newFollowers.trim() || '—',
        avgViews: '—',
        niches: newNiches,
        reels: newReels,
      };

      let updatedList: Creator[];
      if (editingCreator) {
        updatedList = creatorsList.map(c => c.id === editingCreator.id ? updatedCreator : c);
      } else {
        updatedList = [updatedCreator, ...creatorsList];
      }

      setCreatorsList(updatedList);
      await saveCreatorsToBackend(updatedList);

      resetAddModal();
      setShowAddModal(false);
      triggerStatus('success', `Creator ${newName.trim()} ${editingCreator ? 'updated' : 'added'} successfully!`);
    } catch (e: any) {
      setModalError(`Failed to save creator: ${e.message}`);
    } finally {
      setIsSavingCreator(false);
    }
  };

  const toggleNiche = (niche: string) => {
    setNewNiches(prev =>
      prev.includes(niche)
        ? prev.filter(n => n !== niche)
        : [...prev, niche]
    );
  };

  const updateReel = (index: number, field: keyof Reel, value: string) => {
    setNewReels(prev => prev.map((r, i) =>
      i === index ? { ...r, [field]: value } : r
    ));
  };

  const clearCampaign = () => {
    if (confirm('Are you sure you want to clear your local campaign shortlist?')) {
      setCampaignList([]);
      localStorage.removeItem('trylocal_campaignList');
      triggerStatus('success', 'Shortlist cleared.');
    }
  };

  const exportToCSV = () => {
    if (campaignList.length === 0) {
      triggerStatus('error', 'No creators selected to export!');
      return;
    }
    const headers = ['Name', 'Handle', 'Profile URL', 'Followers', 'Categories', 'Reel Video'];
    const rows = campaignList.map(c => {
      const name = c.name ? c.name.replace(/"/g, '""') : '';
      const handle = c.handle ? c.handle.replace(/"/g, '""') : '';
      const profile = c.profileUrl ? c.profileUrl.replace(/"/g, '""') : '';
      const followers = c.followers ? c.followers.replace(/"/g, '""') : '';
      const niches = c.niches ? c.niches.join(', ').replace(/"/g, '""') : '';
      const reel = c.reels && c.reels[0] ? c.reels[0].videoUrl.replace(/"/g, '""') : '';
      return `"${name}","${handle}","${profile}","${followers}","${niches}","${reel}"`;
    });
    
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'TryLocal_Campaign_Export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportCampaignCSV = (campaign: Campaign) => {
    const headers = ['Name', 'Handle', 'Profile URL', 'Followers', 'Categories', 'Reel Video'];
    const rows = campaign.creators.map(c => {
      const name = c.name ? c.name.replace(/"/g, '""') : '';
      const handle = c.handle ? c.handle.replace(/"/g, '""') : '';
      const profile = c.profileUrl ? c.profileUrl.replace(/"/g, '""') : '';
      const followers = c.followers ? c.followers.replace(/"/g, '""') : '';
      const niches = c.niches ? c.niches.join(', ').replace(/"/g, '""') : '';
      const reel = c.reels && c.reels[0] ? c.reels[0].videoUrl.replace(/"/g, '""') : '';
      return `"${name}","${handle}","${profile}","${followers}","${niches}","${reel}"`;
    });
    
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `${campaign.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_creators.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="app-canvas">
      {/* Toast Alert */}
      {statusMessage && (
        <div className={`status-toast status-toast--${statusMessage.type}`}>
          {statusMessage.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="page-header">
        <div className="header-top-bar">
          <div className="page-brand">
            <span className="page-brand__first">FirstFrame</span>
            <span className="page-brand__creators">
              {isAdminView ? 'Try Local (Admin)' : 'Try Local'}
            </span>
          </div>

          {/* Action buttons (Only shown in Admin Route) */}
          {isAdminView && (
            <div className="header-actions" style={{ display: 'flex', gap: '8px' }}>
              <div className="admin-badge">
                <Shield size={14} />
                <span>Admin Mode</span>
              </div>
              <button
                className="action-btn action-btn--secondary"
                style={{ backgroundColor: '#fff', color: '#111', border: '1px solid #e0e0e0' }}
                onClick={() => setShowCampaignsModal(true)}
              >
                <span>Manage Campaigns</span>
              </button>
              <button
                className="action-btn action-btn--primary"
                onClick={() => {
                  resetAddModal();
                  setShowAddModal(true);
                }}
              >
                <Plus size={15} />
                <span>Add Local Creator</span>
              </button>
            </div>
          )}
        </div>
        <p className="page-subtitle">
          {isAdminView ? 'Local Creator Management Console' : 'Discover the best local spots through our creators\' eyes'}
        </p>
      </div>



      {/* Roster Block */}
      <div className="section-block">
        <div className="section-header-box">
          <div className="section-header-inner">
            <span className="section-number">1.</span>
            <span className="section-title">
              {isAdminView ? 'Manage Local Creators' : 'Local Experience Reels'}
            </span>
          </div>
          <p className="section-description">
            {isAdminView
              ? 'Admin Controls: Update creator names inline, delete creators, or click "Add Local Creator" above to upload new portfolios.'
              : 'Watch our local creators explore cafes, restaurants, and hidden gems in your area. Click any card to view their experience.'}
          </p>
        </div>

        {/* Creator Masonry Grid */}
        <div className="masonry-grid" style={{ paddingTop: '4px' }}>
          {creatorsList
            
            .map((creator) => (
            <div
              key={creator.id}
              className="masonry-item"
              style={{
                borderRadius: '16px',
                transition: 'opacity 0.15s ease',
              }}
            >
              <CreatorCard
                creator={creator}
                inCampaign={campaignList.some((c) => c.id === creator.id)}
                onToggleCampaign={handleToggleCampaign}
                isAdminView={isAdminView}
                onUpdateName={handleUpdateName}
                onDelete={handleDelete}
                onEdit={handleEditCreator}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Campaign Shortlist Floating Pill */}
      <AnimatePresence>
        {campaignList.length > 0 && (
          <motion.div
            className="campaign-pill"
            initial={{ opacity: 0, y: 50, scale: 0.9, x: '-50%' }}
            animate={{ opacity: 1, y: 0, scale: 1, x: '-50%' }}
            exit={{ opacity: 0, y: 50, scale: 0.9, x: '-50%' }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            style={{ x: '-50%' }}
          >
            <div className="campaign-pill__content">
              <div className="campaign-pill__badge">
                <CheckSquare size={15} className="campaign-pill__icon" />
                <span className="campaign-pill__label">Campaign Shortlist</span>
                <motion.span
                  key={campaignList.length}
                  className="campaign-pill__count"
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                >
                  {campaignList.length}
                </motion.span>
              </div>
              <div className="campaign-pill__divider"></div>
              <button
                type="button"
                className="campaign-pill__submit-btn"
                onClick={handleSubmitCampaign}
                disabled={submittingCampaign}
              >
                {submittingCampaign ? 'Submitting...' : 'Submit Shortlist'}
              </button>
              <div className="campaign-pill__divider"></div>
              {isAdminView && (
                <>
                  <button
                    type="button"
                    className="campaign-pill__submit-btn"
                    style={{ background: '#fff', color: '#111', border: '1px solid #e0e0e0' }}
                    onClick={exportToCSV}
                  >
                    Export CSV
                  </button>
                  <div className="campaign-pill__divider"></div>
                  <button 
                    type="button"
                    className="campaign-pill__clear-btn"
                    onClick={clearCampaign}
                    disabled={submittingCampaign}
                  >
                    Clear
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Manage Campaigns Modal (Admin only) */}
      {showCampaignsModal && (
        <div className="modal-overlay" onClick={() => setShowCampaignsModal(false)}>
          <div className="modal-card" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Manage Campaigns</h3>
              <button
                className="modal-close"
                onClick={() => setShowCampaignsModal(false)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ padding: '24px', maxHeight: '60vh', overflowY: 'auto' }}>
              {allCampaigns.length === 0 ? (
                <p style={{ color: '#666', textAlign: 'center' }}>No campaigns have been submitted yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {allCampaigns.map(camp => (
                    <div key={camp.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#f9f9f9', borderRadius: '12px', border: '1px solid #eee' }}>
                      <div>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', color: '#111' }}>{camp.name}</h4>
                        <div style={{ display: 'flex', gap: '12px', fontSize: '13px', color: '#666' }}>
                          <span>{camp.creators.length} Creators</span>
                          <span>•</span>
                          <span>{new Date(camp.date).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <button
                        className="action-btn action-btn--secondary"
                        style={{ backgroundColor: '#fff', border: '1px solid #ddd', padding: '8px 16px', fontSize: '13px' }}
                        onClick={() => exportCampaignCSV(camp)}
                      >
                        Export CSV
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Creator Modal (Admin only) */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingCreator ? 'Edit Local Creator' : 'Add New Local Creator'}</h3>
              <button
                className="modal-close"
                onClick={() => setShowAddModal(false)}
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddCreator}>
              <div className="modal-body-scroll">
                {modalError && (
                  <div className="modal-error">{modalError}</div>
                )}

                {/* Name */}
                <div className="form-group">
                  <label>Creator / Spot Name *</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Cafe Explorer"
                  />
                </div>

                {/* Profile URL */}
                <div className="form-group">
                  <label>Instagram Profile URL</label>
                  <input
                    type="text"
                    value={newProfileUrl}
                    onChange={(e) => setNewProfileUrl(e.target.value)}
                    placeholder="e.g. https://instagram.com/cafeexplorer"
                  />
                </div>

                {/* Followers */}
                <div className="form-group">
                  <label>Followers</label>
                  <input
                    type="text"
                    value={newFollowers}
                    onChange={(e) => setNewFollowers(e.target.value)}
                    placeholder="e.g. 12.6K"
                  />
                </div>

                {/* Category pills */}
                <div className="form-group">
                  <label>Categories *</label>
                  <div className="niche-pills">
                    {NICHE_OPTIONS.map((niche) => (
                      <button
                        key={niche}
                        type="button"
                        className={`niche-pill-toggle ${newNiches.includes(niche) ? 'niche-pill-toggle--active' : ''}`}
                        onClick={() => toggleNiche(niche)}
                      >
                        {niche}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reel section */}
                <div className="form-group">
                  <label>Demo Reel URL / Filename *</label>
                  <div className="reel-entry">
                    <input
                      type="text"
                      value={newReels[0]?.videoUrl || ''}
                      onChange={(e) => updateReel(0, 'videoUrl', e.target.value)}
                      placeholder="https://... or local .mp4 filename"
                      disabled={isUploadingVideo}
                    />
                    <span className="reel-entry__helper">
                      Supports: direct .mp4 links · local video filenames in public/videos/
                    </span>
                    <div className="reel-entry__row" style={{ gridTemplateColumns: '1fr' }}>
                      <input
                        type="text"
                        value={newReels[0]?.label || ''}
                        onChange={(e) => updateReel(0, 'label', e.target.value)}
                        placeholder="Label (e.g. Cafe Tour)"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit button */}
              <div style={{ padding: '0 20px 20px' }}>
                <button type="submit" className="modal-submit-btn" disabled={isSavingCreator}>
                  {isSavingCreator ? 'Saving...' : 'Save Local Creator'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
