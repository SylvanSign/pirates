defmodule Pirates.GameServer.Factory do
    use Supervisor

    @name __MODULE__

    def start_link do
        Supervisor.start_link(@name, [], name: @name)
    end

    def init(name) do
        children = [        
            worker(Pirates.GameServer.Instance, name, restart: :temporary),
        ]
        supervise(children, strategy: :simple_one_for_one)        
    end
end
