import { useState } from "react";
import { Plus, Edit, Trash2, Scissors, Clock, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useStore } from "@/stores/useStore";
import { useToast } from "@/hooks/use-toast";

export default function Services() {
  const { toast } = useToast();
  const {
    services,
    addService,
    updateService,
    deleteService,
    cardTemplates,
    addCardTemplate,
    updateCardTemplate,
    deleteCardTemplate,
  } = useStore();

  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [cardDialogOpen, setCardDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<typeof services[0] | null>(null);
  const [editingCard, setEditingCard] = useState<typeof cardTemplates[0] | null>(null);

  // Service form state
  const [serviceName, setServiceName] = useState("");
  const [servicePrice, setServicePrice] = useState("");
  const [serviceDuration, setServiceDuration] = useState("");
  const [serviceCategory, setServiceCategory] = useState("");

  // Card template form state
  const [cardName, setCardName] = useState("");
  const [cardPrice, setCardPrice] = useState("");
  const [cardCount, setCardCount] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  const resetServiceForm = () => {
    setServiceName("");
    setServicePrice("");
    setServiceDuration("");
    setServiceCategory("");
    setEditingService(null);
  };

  const resetCardForm = () => {
    setCardName("");
    setCardPrice("");
    setCardCount("");
    setSelectedServices([]);
    setEditingCard(null);
  };

  const handleServiceSubmit = () => {
    if (!serviceName || !servicePrice) {
      toast({ title: "请填写必要信息", variant: "destructive" });
      return;
    }

    const data = {
      name: serviceName,
      price: parseFloat(servicePrice),
      duration: parseInt(serviceDuration) || 30,
      category: serviceCategory || "其他",
    };

    if (editingService) {
      updateService(editingService.id, data);
      toast({ title: "服务已更新" });
    } else {
      addService(data);
      toast({ title: "服务已添加" });
    }

    resetServiceForm();
    setServiceDialogOpen(false);
  };

  const handleCardSubmit = () => {
    if (!cardName || !cardPrice || !cardCount || selectedServices.length === 0) {
      toast({ title: "请填写完整信息", variant: "destructive" });
      return;
    }

    const data = {
      name: cardName,
      price: parseFloat(cardPrice),
      totalCount: parseInt(cardCount),
      serviceIds: selectedServices,
    };

    if (editingCard) {
      updateCardTemplate(editingCard.id, data);
      toast({ title: "次卡模板已更新" });
    } else {
      addCardTemplate(data);
      toast({ title: "次卡模板已添加" });
    }

    resetCardForm();
    setCardDialogOpen(false);
  };

  const openEditService = (service: typeof services[0]) => {
    setEditingService(service);
    setServiceName(service.name);
    setServicePrice(service.price.toString());
    setServiceDuration(service.duration.toString());
    setServiceCategory(service.category);
    setServiceDialogOpen(true);
  };

  const openEditCard = (card: typeof cardTemplates[0]) => {
    setEditingCard(card);
    setCardName(card.name);
    setCardPrice(card.price.toString());
    setCardCount(card.totalCount.toString());
    setSelectedServices(card.serviceIds);
    setCardDialogOpen(true);
  };

  const categories = [...new Set(services.map((s) => s.category))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">服务管理</h1>
        <p className="text-muted-foreground">管理服务项目和次卡模板</p>
      </div>

      <Tabs defaultValue="services">
        <TabsList>
          <TabsTrigger value="services">服务项目</TabsTrigger>
          <TabsTrigger value="cards">次卡模板</TabsTrigger>
        </TabsList>

        <TabsContent value="services" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button
              onClick={() => {
                resetServiceForm();
                setServiceDialogOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              添加服务
            </Button>
          </div>

          {categories.map((category) => (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="text-base">{category}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {services
                    .filter((s) => s.category === category)
                    .map((service) => (
                      <div
                        key={service.id}
                        className="flex items-center justify-between rounded-lg border border-border p-4"
                      >
                        <div>
                          <p className="font-medium">{service.name}</p>
                          <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />¥{service.price}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {service.duration}分钟
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditService(service)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              deleteService(service.id);
                              toast({ title: "服务已删除" });
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="cards" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button
              onClick={() => {
                resetCardForm();
                setCardDialogOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              添加次卡模板
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {cardTemplates.map((template) => (
              <Card key={template.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{template.name}</p>
                      <p className="text-2xl font-bold text-primary">
                        ¥{template.price}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        共 {template.totalCount} 次
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditCard(template)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          deleteCardTemplate(template.id);
                          toast({ title: "次卡模板已删除" });
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {template.serviceIds.map((sid) => {
                      const service = services.find((s) => s.id === sid);
                      return service ? (
                        <Badge key={sid} variant="secondary" className="text-xs">
                          {service.name}
                        </Badge>
                      ) : null;
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Service Dialog */}
      <Dialog open={serviceDialogOpen} onOpenChange={setServiceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingService ? "编辑服务" : "添加服务"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>服务名称 *</Label>
              <Input
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value)}
                placeholder="如：洗剪吹"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>价格 *</Label>
                <Input
                  type="number"
                  value={servicePrice}
                  onChange={(e) => setServicePrice(e.target.value)}
                  placeholder="38"
                />
              </div>
              <div className="space-y-2">
                <Label>时长(分钟)</Label>
                <Input
                  type="number"
                  value={serviceDuration}
                  onChange={(e) => setServiceDuration(e.target.value)}
                  placeholder="30"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>分类</Label>
              <Input
                value={serviceCategory}
                onChange={(e) => setServiceCategory(e.target.value)}
                placeholder="如：剪发、烫染"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setServiceDialogOpen(false)}
              >
                取消
              </Button>
              <Button className="flex-1" onClick={handleServiceSubmit}>
                确认
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Card Template Dialog */}
      <Dialog open={cardDialogOpen} onOpenChange={setCardDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCard ? "编辑次卡模板" : "添加次卡模板"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>次卡名称 *</Label>
              <Input
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                placeholder="如：洗剪吹10次卡"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>售价 *</Label>
                <Input
                  type="number"
                  value={cardPrice}
                  onChange={(e) => setCardPrice(e.target.value)}
                  placeholder="280"
                />
              </div>
              <div className="space-y-2">
                <Label>次数 *</Label>
                <Input
                  type="number"
                  value={cardCount}
                  onChange={(e) => setCardCount(e.target.value)}
                  placeholder="10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>关联服务 *</Label>
              <div className="max-h-40 space-y-2 overflow-auto rounded-lg border border-border p-3">
                {services.map((service) => (
                  <div key={service.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`service-${service.id}`}
                      checked={selectedServices.includes(service.id)}
                      onCheckedChange={(checked) => {
                        setSelectedServices(
                          checked
                            ? [...selectedServices, service.id]
                            : selectedServices.filter((id) => id !== service.id)
                        );
                      }}
                    />
                    <label htmlFor={`service-${service.id}`} className="text-sm">
                      {service.name} - ¥{service.price}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setCardDialogOpen(false)}
              >
                取消
              </Button>
              <Button className="flex-1" onClick={handleCardSubmit}>
                确认
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
